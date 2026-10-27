<?php

declare(strict_types=1);

use Jcherniak\EmailToIcs\Input\ReplyEmailParser;
use Jcherniak\EmailToIcs\Mail\EmailMessage;
use PHPUnit\Framework\TestCase;

final class ReplyEmailParserTest extends TestCase
{
    private const KEY = 'abcdefabcdefabcdefabcdefabcdef12';

    private function fixture(string $name): string
    {
        return file_get_contents(__DIR__ . '/artifacts/sources/replies/' . $name);
    }

    private function body(array $overrides): array
    {
        return array_merge([
            'From' => 'recipient@example.test',
            'FromName' => 'Recipient',
            'To' => 'edit-' . self::KEY . '@reply.example.test',
            'ToFull' => [['Email' => 'edit-' . self::KEY . '@reply.example.test', 'Name' => '']],
            'CcFull' => [],
            'Subject' => 'Re: Opera Parallele - Doubt',
            'MessageID' => 'reply-message-id',
            'TextBody' => '',
            'HtmlBody' => '',
        ], $overrides);
    }

    public function testGmailTextReply(): void
    {
        $reply = ReplyEmailParser::parse($this->body(['TextBody' => $this->fixture('gmail-text.txt')]));

        $this->assertSame(self::KEY, $reply->key);
        $this->assertSame('Please move it to 8pm and add a note that doors open at 7.', $reply->instructions);
        $this->assertSame(PresidioExpected::URL, $reply->quotedSourceUrl, 'marker wrapped onto the next quoted line is reassembled');
        $this->assertNull($reply->modelOverride);
        $this->assertFalse($reply->multiRequested);
        $this->assertStringContainsString('Opera Parallele presents Doubt', $reply->quotedOriginalText);
        $this->assertStringNotContainsString('> ', $reply->quotedOriginalText);
        $this->assertStringNotContainsString('Please move it', $reply->quotedOriginalText);
    }

    public function testGmailHtmlOnlyReply(): void
    {
        $reply = ReplyEmailParser::parse($this->body(['HtmlBody' => $this->fixture('gmail-html.html')]));

        $this->assertSame('Only keep the Saturday performance please.', $reply->instructions);
        $this->assertSame(PresidioExpected::URL, $reply->quotedSourceUrl);
        $this->assertStringContainsString('Source data', $reply->quotedOriginalText);
    }

    public function testAppleMailFlowedReplyWithModelOverride(): void
    {
        $reply = ReplyEmailParser::parse($this->body(['TextBody' => $this->fixture('applemail-flowed.txt')]));

        $this->assertSame('Change the location to the main stage and make it 3 hours.', $reply->instructions);
        $this->assertSame('~anthropic/claude-sonnet-latest', $reply->modelOverride);
        $this->assertSame(PresidioExpected::URL, $reply->quotedSourceUrl, 'soft-wrapped marker inside the quote is reassembled');
    }

    public function testOutlookReplyWithMultipleToken(): void
    {
        $reply = ReplyEmailParser::parse($this->body(['TextBody' => $this->fixture('outlook-text.txt')]));

        $this->assertSame('Add a 30 minute reminder and <multiple> please.', $reply->instructions);
        $this->assertTrue($reply->multiRequested);
        $this->assertSame(PresidioExpected::URL, $reply->quotedSourceUrl);
        $this->assertStringContainsString('From: Email to ICS', $reply->quotedOriginalText);
    }

    public function testStrippedTextReplyIsPreferredAndKeyFromCc(): void
    {
        $reply = ReplyEmailParser::parse($this->body([
            'To' => 'someone@example.test',
            'ToFull' => [['Email' => 'someone@example.test', 'Name' => '']],
            'CcFull' => [['Email' => 'EDIT-' . strtoupper(self::KEY) . '@reply.example.test', 'Name' => '']],
            'StrippedTextReply' => 'Use 6pm instead',
            'TextBody' => "Use 6pm instead\n\n> old stuff",
        ]));

        $this->assertSame(self::KEY, $reply->key);
        $this->assertSame('Use 6pm instead', $reply->instructions);
        $this->assertNull($reply->quotedSourceUrl);

        $this->assertNull(ReplyEmailParser::findEditKey(['ToFull' => [['Email' => 'calendar@example.test']]]));
        $this->assertSame(self::KEY, ReplyEmailParser::findEditKey(['OriginalRecipient' => 'edit-' . self::KEY . '@reply.example.test']));
    }

    public function testFallbackToSourceUrlLineAndEmptyReply(): void
    {
        $reply = ReplyEmailParser::parse($this->body(['TextBody' => "\n\n> Source URL: https://example.test/page?a=1.\n> more"]));
        $this->assertSame('', $reply->instructions);
        $this->assertSame('https://example.test/page?a=1', $reply->quotedSourceUrl);

        [$text, $model] = ReplyEmailParser::splitModelOverride("first line\nmodel: ~openai/gpt-latest\nlast line");
        $this->assertSame("first line\n\nlast line", $text);
        $this->assertSame('~openai/gpt-latest', $model);
    }

    public function testEmailMessageCarriesReplyTo(): void
    {
        $withReplyTo = new EmailMessage('from@example.test', 'to@example.test', 'Subject', '<p>hi</p>', [], [], 'edit-' . self::KEY . '@reply.example.test');
        $this->assertSame('edit-' . self::KEY . '@reply.example.test', $withReplyTo->toPostmarkPayload()['ReplyTo']);

        $without = new EmailMessage('from@example.test', 'to@example.test', 'Subject', '<p>hi</p>');
        $this->assertArrayNotHasKey('ReplyTo', $without->toPostmarkPayload());
    }
}
