chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'width': 800,
    'height': 700
  });
});
