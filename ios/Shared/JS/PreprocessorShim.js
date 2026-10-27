// PreprocessorShim.js - Safari share-extension entry point (NSExtensionJavaScriptPreprocessingFile).
// Safari calls ExtensionPreprocessingJS.run() in the page before showing the extension; the returned
// dictionary arrives in the extension as NSExtensionJavaScriptPreprocessingResultsKey.
var WebToICSPreprocessor = function () {};
WebToICSPreprocessor.prototype = {
  run: function (args) {
    var result;
    try {
      result = WebToICS.clean(document, window);
    } catch (e) {
      result = {
        url: document.URL || '',
        title: document.title || '',
        siteName: '',
        selection: '',
        text: '',
        truncated: false,
        html: '',
        htmlTruncated: false,
        method: 'error',
        error: String(e && e.message ? e.message : e)
      };
    }
    args.completionFunction(result);
  },
  finalize: function (args) {}
};
var ExtensionPreprocessingJS = new WebToICSPreprocessor();
