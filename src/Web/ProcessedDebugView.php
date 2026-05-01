<?php

declare(strict_types=1);

namespace Jcherniak\EmailToIcs\Web;

use Jcherniak\EmailToIcs\Processed\ProcessedRecord;
use Jcherniak\EmailToIcs\Processed\ProcessedRecordStore;

final class ProcessedDebugView
{
    public function __construct(private readonly ProcessedRecordStore $store)
    {
    }

    public static function isEnabled(array $env = null): bool
    {
        $env ??= $_ENV;
        return filter_var($env['DEBUG_PROCESSED_VIEW_ENABLED'] ?? false, FILTER_VALIDATE_BOOL);
    }

    public function renderIndex(): string
    {
        $rows = '';
        foreach ($this->store->listRecords() as $record) {
            $dates = implode(', ', $record['parsedDates'] ?? []);
            $url = (string)($record['downloadedUrl'] ?? '');
            $rows .= '<tr>'
                . '<td><a href="?debug_processed=1&id=' . rawurlencode((string)$record['id']) . '">' . $this->e((string)$record['createdAt'] ?: (string)$record['filename']) . '</a></td>'
                . '<td class="text-break">' . ($url !== '' ? '<a href="' . $this->e($url) . '" target="_blank" rel="noopener">' . $this->e($url) . '</a>' : '') . '</td>'
                . '<td>' . $this->e((string)($record['pageTitle'] ?? '')) . '</td>'
                . '<td>' . $this->e((string)($record['parsedTitle'] ?? '')) . '</td>'
                . '<td>' . $this->e($dates) . '</td>'
                . '<td>' . $this->e((string)($record['status'] ?? '')) . '</td>'
                . '</tr>';
        }

        if ($rows === '') {
            $rows = '<tr><td colspan="6" class="text-muted">No processed records found.</td></tr>';
        }

        return $this->page('Processed Debug', <<<HTML
<div class="d-flex align-items-center justify-content-between mb-3">
  <h1 class="h3 mb-0">Processed Debug</h1>
  <a class="btn btn-outline-secondary btn-sm" href="/">Main Form</a>
</div>
<div class="table-responsive">
  <table class="table table-sm table-striped align-middle">
    <thead>
      <tr>
        <th>Created</th>
        <th>URL</th>
        <th>Page Title</th>
        <th>Parsed Title</th>
        <th>Parsed Dates</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>{$rows}</tbody>
  </table>
</div>
HTML);
    }

    public function renderDetail(string $id): string
    {
        $record = $this->store->readRecord($id);
        if ($record === null) {
            http_response_code(404);
            return $this->page('Processed Debug', '<p>Processed record not found.</p><p><a href="?debug_processed=1">Back</a></p>');
        }

        $url = (string)($record->latestAttempt['downloadedUrl'] ?? '');
        $pageTitle = (string)($record->latestAttempt['pageTitle'] ?? '');
        $parsedTitle = (string)($record->latestAttempt['parsedTitle'] ?? '');
        $parsedDates = implode(', ', $record->latestAttempt['parsedDates'] ?? []);
        $jsonForViewer = json_encode($record->generatedJson ?? new \stdClass(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
        $rawJson = $this->e($record->normalizedJson);
        $ics = $this->e($record->ics ?? '');
        $sourceTabs = $this->renderSourceTabs($record, $url);
        $safeId = $this->e($record->id);
        $safePageTitle = $this->e($pageTitle);
        $safeParsedTitle = $this->e($parsedTitle);
        $safeParsedDates = $this->e($parsedDates);
        $urlLink = $this->link($url);

        return $this->page('Processed Debug Detail', <<<HTML
<div class="d-flex align-items-center justify-content-between mb-3">
  <div>
    <h1 class="h4 mb-1">{$safeId}</h1>
    <div class="small text-muted">{$safePageTitle}</div>
  </div>
  <div class="d-flex gap-2">
    <a class="btn btn-outline-secondary btn-sm" href="?debug_processed=1">Back</a>
    <form method="post" class="m-0">
      <input type="hidden" name="debug_processed_replay" value="1">
      <input type="hidden" name="id" value="{$safeId}">
      <button class="btn btn-primary btn-sm" type="submit">Replay / Retry</button>
    </form>
  </div>
</div>
<dl class="row small">
  <dt class="col-sm-2">URL</dt><dd class="col-sm-10 text-break">{$urlLink}</dd>
  <dt class="col-sm-2">Parsed Title</dt><dd class="col-sm-10">{$safeParsedTitle}</dd>
  <dt class="col-sm-2">Parsed Dates</dt><dd class="col-sm-10">{$safeParsedDates}</dd>
</dl>
<div class="debug-grid">
  <section>
    <h2>Processed JSON</h2>
    <pre>{$rawJson}</pre>
  </section>
  <section>
    <h2>Source Capture</h2>
    {$sourceTabs}
  </section>
  <section>
    <h2>Generated JSON</h2>
    <json-viewer id="generatedJsonViewer" expand="2"></json-viewer>
  </section>
  <section>
    <h2>ICS</h2>
    <pre>{$ics}</pre>
  </section>
</div>
<script type="module" src="https://unpkg.com/@alenaksu/json-viewer?module"></script>
<script>
  customElements.whenDefined('json-viewer').then(() => {
    document.getElementById('generatedJsonViewer').data = {$jsonForViewer};
  });
</script>
HTML);
    }

    private function renderSourceTabs(ProcessedRecord $record, string $url): string
    {
        $savedHtml = $this->e($record->emailHtml ?? '');
        $downloaded = $this->e($record->downloadedContent ?? '');
        $screenshot = $record->screenshotBase64
            ? '<img class="img-fluid border" alt="Saved screenshot" src="data:image/png;base64,' . $this->e($record->screenshotBase64) . '">'
            : '<p class="text-muted">No screenshot saved.</p>';
        $current = $url !== ''
            ? '<p><a href="' . $this->e($url) . '" target="_blank" rel="noopener">current view</a></p><iframe class="source-frame" src="' . $this->e($url) . '"></iframe>'
            : '<p class="text-muted">No URL saved.</p>';

        return <<<HTML
<ul class="nav nav-tabs source-tabs" role="tablist">
  <li class="nav-item"><button class="nav-link active" data-tab="saved-html" type="button">Saved HTML</button></li>
  <li class="nav-item"><button class="nav-link" data-tab="downloaded" type="button">API / Download</button></li>
  <li class="nav-item"><button class="nav-link" data-tab="screenshot" type="button">Screenshot</button></li>
  <li class="nav-item"><button class="nav-link" data-tab="current" type="button">Current</button></li>
</ul>
<div class="source-panel" data-panel="saved-html"><pre>{$savedHtml}</pre></div>
<div class="source-panel d-none" data-panel="downloaded"><pre>{$downloaded}</pre></div>
<div class="source-panel d-none" data-panel="screenshot">{$screenshot}</div>
<div class="source-panel d-none" data-panel="current">{$current}</div>
<script>
document.querySelectorAll('.source-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.source-tabs button').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.source-panel').forEach((panel) => panel.classList.add('d-none'));
    button.classList.add('active');
    document.querySelector(`[data-panel="\${button.dataset.tab}"]`).classList.remove('d-none');
  });
});
</script>
HTML;
    }

    private function page(string $title, string $body): string
    {
        $safeTitle = $this->e($title);
        return <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$safeTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <style>
    body { padding: 1rem; }
    .debug-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1rem; }
    .debug-grid section { min-width: 0; border: 1px solid #ddd; border-radius: 6px; padding: 0.75rem; }
    .debug-grid h2 { font-size: 1rem; margin-bottom: 0.5rem; }
    pre { max-height: 48vh; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 0.82rem; }
    .source-frame { width: 100%; min-height: 42vh; border: 1px solid #ccc; }
    json-viewer { display: block; max-height: 48vh; overflow: auto; }
  </style>
</head>
<body>
  <main class="container-fluid">
    {$body}
  </main>
</body>
</html>
HTML;
    }

    private function link(string $url): string
    {
        return $url === '' ? '' : '<a href="' . $this->e($url) . '" target="_blank" rel="noopener">' . $this->e($url) . '</a>';
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
