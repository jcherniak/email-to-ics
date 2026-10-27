<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Web;

use Jcherniak\EmailToIcs\Candidates\CandidateLinks;
use Jcherniak\EmailToIcs\Candidates\CandidateSet;
use Jcherniak\EmailToIcs\Candidates\CandidateStore;

/**
 * Public (key-authenticated) endpoints behind the links in candidate emails and the
 * extension/web review confirmation. Every GET link lands on a confirm page that POSTs;
 * nothing is sent on a GET unless CANDIDATE_LINKS_REQUIRE_CONFIRM=0.
 */
final class CandidateController
{
    /** @var \Closure(): object */
    private \Closure $processorFactory;

    /**
     * @param \Closure(): object $processorFactory returns an EmailProcessor (or a fake) with sendCandidateEvents()
     */
    public function __construct(
        private readonly CandidateStore $store,
        \Closure $processorFactory,
        private readonly bool $requireConfirm = true,
        private readonly string $baseUrl = '',
    ) {
        $this->processorFactory = $processorFactory;
    }

    public static function fromEnvironment(string $projectRoot, \Closure $processorFactory, array $env = null): self
    {
        $env ??= $_ENV;
        $requireConfirm = !in_array(strtolower(trim((string)($env['CANDIDATE_LINKS_REQUIRE_CONFIRM'] ?? '1'))), ['0', 'false', 'no', 'off'], true);

        return new self(CandidateStore::fromEnvironment($projectRoot, $env), $processorFactory, $requireConfirm, CandidateLinks::baseUrl($env));
    }

    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $post
     */
    public function handle(string $method, array $query, array $post): void
    {
        $key = (string)($query['candidates'] ?? '');
        $action = (string)($query['action'] ?? $post['action'] ?? CandidateLinks::ACTION_PICK);

        $set = $this->loadOrRespond($key, false);
        if ($set === null) {
            return;
        }

        $method = strtoupper($method);
        if ($method === 'POST' && $action === CandidateLinks::ACTION_SEND) {
            $indexes = $this->parseIndexes($post['idx'] ?? $post['indexes'] ?? null, $set);
            if ($indexes === null) {
                $this->htmlResponse(400, 'Invalid selection', '<p>Please select at least one valid event.</p>' . $this->backLink($set));
                return;
            }
            $this->sendAndRender($set, $indexes);
            return;
        }

        if ($method !== 'GET') {
            $this->htmlResponse(405, 'Method not allowed', '<p>Unsupported request.</p>');
            return;
        }

        switch ($action) {
            case CandidateLinks::ACTION_ALL:
                $indexes = $set->allIndexes();
                if (!$this->requireConfirm) {
                    $this->sendAndRender($set, $indexes);
                    return;
                }
                $this->renderConfirm($set, $indexes, 'Create all ' . count($indexes) . ' events');
                return;

            case CandidateLinks::ACTION_ONE:
                $index = isset($query['idx']) && is_numeric($query['idx']) ? (int)$query['idx'] : null;
                if ($index === null || $set->candidate($index) === null) {
                    $this->htmlResponse(400, 'Unknown event', '<p>That event number does not exist in this set.</p>' . $this->backLink($set));
                    return;
                }
                if (!$this->requireConfirm) {
                    $this->sendAndRender($set, [$index]);
                    return;
                }
                $this->renderConfirm($set, [$index], 'Create this event');
                return;

            case CandidateLinks::ACTION_PICK:
                $this->renderPicker($set);
                return;

            default:
                $this->htmlResponse(400, 'Unknown action', '<p>Unknown action.</p>' . $this->backLink($set));
        }
    }

    /**
     * JSON confirmation used by the Chrome extension / web review step:
     * POST ?confirm=true with confirmationToken (or candidateKey) and optional indexes[].
     *
     * @param array<string, mixed> $post
     */
    public function handleConfirm(array $post): void
    {
        $key = (string)($post['candidateKey'] ?? $post['confirmationToken'] ?? '');
        $set = $this->loadOrRespond($key, true);
        if ($set === null) {
            return;
        }

        $raw = $post['indexes'] ?? $post['idx'] ?? null;
        $indexes = $raw === null || $raw === '' || $raw === [] ? $set->allIndexes() : $this->parseIndexes($raw, $set);
        if ($indexes === null) {
            $this->jsonResponse(400, ['error' => 'Invalid event selection.']);
            return;
        }

        try {
            $sent = ($this->processorFactory)()->sendCandidateEvents($set, $indexes);
        } catch (\Throwable $e) {
            $this->log("Error sending confirmed candidate events for {$key}: " . $e->getMessage());
            $this->jsonResponse(500, ['error' => 'Failed to send confirmed email.']);
            return;
        }

        $this->jsonResponse(200, [
            'status' => 'success',
            'message' => $sent === 1 ? 'Email confirmed and sent successfully.' : "{$sent} calendar emails sent successfully.",
            'sent' => $sent,
            'sentIndexes' => $indexes,
            'recipientEmail' => $set->recipientEmail,
        ]);
    }

    private function loadOrRespond(string $key, bool $json): ?CandidateSet
    {
        if (!CandidateStore::isValidKey($key)) {
            $json
                ? $this->jsonResponse(400, ['error' => 'Invalid or missing confirmation token.'])
                : $this->htmlResponse(400, 'Invalid link', '<p>This link is not valid.</p>');
            return null;
        }

        $set = $this->store->load($key);
        if ($set !== null) {
            return $set;
        }

        if ($this->store->exists($key)) {
            $json
                ? $this->jsonResponse(410, ['error' => 'Confirmation token expired.'])
                : $this->htmlResponse(410, 'Link expired', '<p>These events have expired. Reply to the original email with instructions, or submit the page again.</p>');
            return null;
        }

        $json
            ? $this->jsonResponse(404, ['error' => 'Confirmation token not found or expired.'])
            : $this->htmlResponse(404, 'Not found', '<p>These events were not found. They may have expired; reply to the original email with instructions, or submit the page again.</p>');
        return null;
    }

    /**
     * @return list<int>|null
     */
    private function parseIndexes(mixed $raw, CandidateSet $set): ?array
    {
        if (is_string($raw)) {
            $raw = preg_split('/[\s,]+/', trim($raw), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        }
        if (!is_array($raw)) {
            return null;
        }

        $indexes = [];
        foreach ($raw as $value) {
            if (!is_numeric($value) || $set->candidate((int)$value) === null) {
                return null;
            }
            $indexes[] = (int)$value;
        }
        $indexes = array_values(array_unique($indexes));
        sort($indexes);

        return $indexes === [] ? null : $indexes;
    }

    /** @param list<int> $indexes */
    private function sendAndRender(CandidateSet $set, array $indexes): void
    {
        try {
            $sent = ($this->processorFactory)()->sendCandidateEvents($set, $indexes);
        } catch (\Throwable $e) {
            $this->log("Error sending candidate events for {$set->key}: " . $e->getMessage());
            $this->htmlResponse(500, 'Sending failed', '<p>Sorry, the calendar email could not be sent. The error has been logged.</p>' . $this->backLink($set));
            return;
        }

        $items = '';
        foreach ($indexes as $index) {
            $candidate = $set->candidate($index);
            if ($candidate !== null) {
                $items .= '<li>' . $this->e($candidate->summary()) . ' - ' . $this->e($candidate->when()) . '</li>';
            }
        }
        $noun = $sent === 1 ? 'calendar email' : 'calendar emails';
        $this->htmlResponse(200, 'Sent', "<p><b>{$sent} {$noun} sent to " . $this->e($set->recipientEmail) . '.</b></p><ul>' . $items . '</ul>' . $this->backLink($set));
    }

    /** @param list<int> $indexes */
    private function renderConfirm(CandidateSet $set, array $indexes, string $buttonLabel): void
    {
        $items = '';
        $hidden = '';
        foreach ($indexes as $index) {
            $candidate = $set->candidate($index);
            if ($candidate === null) {
                continue;
            }
            $items .= '<li><b>' . $this->e($candidate->summary()) . '</b><br>' . $this->e($candidate->when())
                . ($candidate->location() !== '' ? '<br><span class="muted">' . $this->e($candidate->location()) . '</span>' : '')
                . $this->sentNote($set, $index) . '</li>';
            $hidden .= '<input type="hidden" name="idx[]" value="' . $index . '">';
        }

        $form = '<form method="post" action="' . $this->e(CandidateLinks::url($this->baseUrl, $set->key, CandidateLinks::ACTION_SEND)) . '">'
            . $hidden . '<button type="submit">' . $this->e($buttonLabel) . '</button></form>';

        $this->htmlResponse(200, 'Confirm', '<p>Send to <b>' . $this->e($set->recipientEmail) . '</b>:</p><ul>' . $items . '</ul>' . $form . $this->backLink($set));
    }

    private function renderPicker(CandidateSet $set): void
    {
        $items = '';
        foreach ($set->candidates as $candidate) {
            $id = 'c' . $candidate->index;
            $items .= '<li><label for="' . $id . '"><input type="checkbox" id="' . $id . '" name="idx[]" value="' . $candidate->index . '" checked> '
                . '<b>' . $this->e($candidate->summary()) . '</b><br>' . $this->e($candidate->when())
                . ($candidate->location() !== '' ? '<br><span class="muted">' . $this->e($candidate->location()) . '</span>' : '')
                . $this->sentNote($set, $candidate->index) . '</label></li>';
        }

        $form = '<form method="post" action="' . $this->e(CandidateLinks::url($this->baseUrl, $set->key, CandidateLinks::ACTION_SEND)) . '">'
            . '<ul class="picker">' . $items . '</ul><button type="submit">Send selected events</button></form>';

        $this->htmlResponse(200, 'Choose events', '<p>Choose which events to send to <b>' . $this->e($set->recipientEmail) . '</b>:</p>' . $form);
    }

    private function sentNote(CandidateSet $set, int $index): string
    {
        return in_array($index, $set->sentIndexes, true) ? ' <span class="muted">(already sent)</span>' : '';
    }

    private function backLink(CandidateSet $set): string
    {
        return '<p><a href="' . $this->e(CandidateLinks::url($this->baseUrl, $set->key, CandidateLinks::ACTION_PICK)) . '">Choose events</a></p>';
    }

    private function htmlResponse(int $status, string $title, string $body): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: text/html; charset=utf-8');
            header('Cache-Control: no-store');
        }
        $safeTitle = $this->e($title);
        echo <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{$safeTitle} - Email to ICS</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;line-height:1.4}ul{padding-left:1.2rem}li{margin-bottom:.75rem}.muted{color:#666;font-size:.9em}button{font-size:1rem;padding:.6rem 1.2rem;background:#1d6fd6;color:#fff;border:0;border-radius:6px;cursor:pointer}.picker{list-style:none;padding:0}</style>
</head><body><h1 style="font-size:1.3rem">{$safeTitle}</h1>
{$body}
</body></html>
HTML;
    }

    /** @param array<string, mixed> $payload */
    private function jsonResponse(int $status, array $payload): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json');
        }
        echo json_encode($payload);
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function log(string $message): void
    {
        if (function_exists('errlog')) {
            errlog($message);
        }
    }
}
