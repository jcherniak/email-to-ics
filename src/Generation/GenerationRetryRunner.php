<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Generation;

/**
 * Retry order: for each model, for each fetch level, for each content variant
 * (snippet then full). Fetched content is cached by the provider so later models reuse it.
 */
final class GenerationRetryRunner
{
    /** @var \Closure(string $model, ContentVariant $variant): array */
    private \Closure $generate;
    private \Closure $clock;

    /**
     * @param \Closure(string, ContentVariant): array $generate returns the eventDetails array for one attempt
     * @param null|\Closure(): float $clock returns seconds (microtime(true) by default)
     */
    public function __construct(
        \Closure $generate,
        private readonly EventResponseValidator $validator = new EventResponseValidator(),
        private readonly int $maxAttempts = 24,
        private readonly int $timeBudgetSeconds = 600,
        ?\Closure $clock = null,
        private readonly mixed $logger = null,
    ) {
        $this->generate = $generate;
        $this->clock = $clock ?? static fn(): float => microtime(true);
    }

    /**
     * @param list<string> $models
     */
    public function run(array $models, ContentVariantProvider $provider): GenerationOutcome
    {
        $start = ($this->clock)();
        $attempts = [];
        $counted = 0;
        $lastDetails = null;
        $stop = GenerationOutcome::STOP_ALL_FAILED;
        $notedEmptyLevels = [];
        $sawContent = false;

        foreach ($models as $model) {
            foreach ($provider->levels() as $level) {
                $variants = $provider->variantsForLevel($level);
                if ($variants === []) {
                    if (!isset($notedEmptyLevels[$level])) {
                        $notedEmptyLevels[$level] = true;
                        $error = 'fetch failed: ' . ($provider->lastError($level) ?? 'no content');
                        $attempts[] = new GenerationAttempt(count($attempts) + 1, $model, $level, ContentVariant::NONE, false, $error, 0, 0, date('c'), false);
                        $this->log("Skipping level {$level}: {$error}");
                    }
                    continue;
                }
                $sawContent = true;

                foreach ($variants as $variant) {
                    if ($counted >= $this->maxAttempts) {
                        $stop = GenerationOutcome::STOP_MAX_ATTEMPTS;
                        break 3;
                    }
                    if (($this->clock)() - $start > $this->timeBudgetSeconds) {
                        $stop = GenerationOutcome::STOP_TIME_BUDGET;
                        break 3;
                    }

                    $counted++;
                    $attemptStart = ($this->clock)();
                    $this->log("Generation attempt #{$counted}: model {$model}, content {$variant->label()}");
                    try {
                        $details = ($this->generate)($model, $variant);
                    } catch (\Throwable $e) {
                        $details = [
                            'success' => false,
                            'errorMessage' => 'Exception: ' . $e->getMessage(),
                            'eventData' => null,
                            'emailSubject' => 'Error: Exception',
                            'locationLookup' => null,
                        ];
                    }
                    $error = $this->validator->validate($details);
                    $durationMs = (int)round((($this->clock)() - $attemptStart) * 1000);
                    $attempt = new GenerationAttempt(
                        count($attempts) + 1,
                        $model,
                        $variant->level,
                        $variant->variant,
                        $error === null,
                        $error,
                        $durationMs,
                        EventResponseValidator::countEvents($details),
                        date('c'),
                    );
                    $attempts[] = $attempt;
                    $this->log($attempt->describe());

                    if ($error === null) {
                        return new GenerationOutcome(true, $details, $attempt, $attempts, $variant, GenerationOutcome::STOP_SUCCESS, $provider->fetchSummary());
                    }
                    $lastDetails = is_array($details) ? $details : null;
                }
            }
        }

        if (!$sawContent && $stop === GenerationOutcome::STOP_ALL_FAILED) {
            $stop = GenerationOutcome::STOP_NO_CONTENT;
        }

        $lastDetails ??= [
            'success' => false,
            'errorMessage' => $stop === GenerationOutcome::STOP_NO_CONTENT ? 'No content could be fetched for generation' : 'No generation attempts were made',
            'eventData' => null,
            'emailSubject' => 'Error: Generation Failed',
            'locationLookup' => null,
        ];
        if (($lastDetails['success'] ?? false) === true) {
            $lastDetails['success'] = false;
        }

        return new GenerationOutcome(false, $lastDetails, null, $attempts, null, $stop, $provider->fetchSummary());
    }

    private function log(string $message): void
    {
        if (is_callable($this->logger)) {
            ($this->logger)($message);
        } elseif (function_exists('errlog')) {
            errlog($message);
        }
    }
}
