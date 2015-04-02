var assetsLoaded = 0;
var assets = [
  {pos: 'head', tag: 'link', attrs: {rel: 'stylesheet', type: 'text/css', href: '/webapp/#{path}wiconnect.css'}},
  {pos: 'body', tag: 'script', attrs: { type: 'text/javascript', src: '/webapp/#{path}wiconnect.js'}}
];
for(var i = 0; i < assets.length; i++) {
  var asset = document.createElement(assets[i].tag);
  for(var j = 0; j < Object.keys(assets[i].attrs).length; j++) {
    asset[Object.keys(assets[i].attrs)[j]] = assets[i].attrs[Object.keys(assets[i].attrs)[j]];
  }
  document[assets[i].pos].appendChild(asset);
  asset.addEventListener('load', assetLoad);
  asset.addEventListener('error', assetErr);
}
function assetLoad(e){assetsLoaded++;if(assetsLoaded === assets.length && (typeof _webapp === 'undefined')){top.location = '/.recovery.html';}}
function assetErr(e){top.location = '/.recovery.html';}
