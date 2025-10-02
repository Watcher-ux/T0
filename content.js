// content.js
function getText() {
  const sel = window.getSelection()?.toString()?.trim();
  if (sel) return sel;
  const article = document.querySelector('article');
  return article ? article.innerText : document.body.innerText;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_TEXT') {
    sendResponse({ text: getText().slice(0, 20000) }); // conservative cap
  }
});
