// Placeholder Safari preprocessor; replaced by the generated Readability-based cleaner (scripts/build-js.sh).
var WebToICSPreprocessor = function () {};
WebToICSPreprocessor.prototype = {
  run: function (args) {
    args.completionFunction({ url: document.URL, title: document.title, text: "", html: "", selection: "", method: "placeholder", truncated: false });
  },
  finalize: function () {}
};
var ExtensionPreprocessingJS = new WebToICSPreprocessor();
