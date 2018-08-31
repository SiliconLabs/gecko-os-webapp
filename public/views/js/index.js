var assetsLoaded = 0;
var assets = {
  '/webapp/#{path}gecko-os.css': {pos: 'head', tag: 'link', attrs: {rel: 'stylesheet', type: 'text/css', href: '/webapp/#{path}gecko-os.css'}, attempt: 1},
  '/webapp/#{path}gecko-os.js': {pos: 'body', tag: 'script', attrs: { type: 'text/javascript', src: '/webapp/#{path}gecko-os.js'}, attempt: 1}
};
function loadAsset(asset) {
  asset.el = document.createElement(asset.tag);
  for(var j = 0; j < Object.keys(asset.attrs).length; j++) {
    asset.el[Object.keys(asset.attrs)[j]] = asset.attrs[Object.keys(asset.attrs)[j]];
  }
  document[asset.pos].appendChild(asset.el);
  asset.el.addEventListener('load', assetLoad);
  asset.el.addEventListener('error', assetErr);
}
function assetLoad(e){assetsLoaded++;if(assetsLoaded === assets.length && (typeof _webapp === 'undefined')){top.location = '/.recovery.html';}}
function assetErr(e){
  var asset = assets[(e.target.src||e.target.href).replace(window.location.origin,'')];
  if(asset.attempt < 3) {
    asset.attempt++;
    document[asset.pos].removeChild(this);
    return setTimeout(loadAsset, 1000, asset);
  }
  top.location = '/.recovery.html';
}
Object.keys(assets).forEach(function(asset){loadAsset(assets[asset])});
