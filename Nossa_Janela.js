//=============================================================================
// LZOGames
// Nossa_Janela.js
// VersÃ£o: 1.00
//=============================================================================
 /*:
 * @plugindesc v1.00 Crie sua janela personalizada
 * @author Guilherme Santos
 *
 * @help
 * Nossa janela melhor que nunca
 */

var LZO = LZO || {};

 function Nossa_Janelinha() {
    this.initialize.apply(this, arguments);
}

Nossa_Janelinha.prototype = Object.create(Window_Base.prototype);
Nossa_Janelinha.prototype.constructor = Nossa_Janelinha;

Nossa_Janelinha.prototype.initialize = function(x, y) {
    var width = this.windowWidth();
    var height = this.windowHeight();
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
};

Nossa_Janelinha.prototype.windowWidth = function() {
    return 240;
};

Nossa_Janelinha.prototype.windowHeight = function() {
    return 240;
};

Nossa_Janelinha.prototype.refresh = function() {
    this.contents.clear();
};

LZO.MapStart = Scene_Map.prototype.start; 
Scene_Map.prototype.start = function() {
    LZO.MapStart.call(this);
    this._NossaJanelinha = new Nossa_Janelinha(0, 60);
    this.addWindow(this._NossaJanelinha);
};
