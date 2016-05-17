//=============================================================================
// LZOGames - Tutoriais
//-----------------------------------------------------------------------------
// Interruptores_Locais.js
//-----------------------------------------------------------------------------
// Version: 1.0
//=============================================================================
/*:
 * @plugindesc Ativa e desativa interruptores locais
 * @author LZOGames
 *
 * @param Switch Automatico
 * @desc Escolha um switch para ser ativado automaticamente
 * Esse Switch sera ativado quando o jogo iniciar
 * @default 0
 * 
 * @help
 *
 * Exemplos comandos de plugin:
 *   InterruptorLocal 3 A true  # Liga o interruptor A do evento 3
 *   InterruptorLocal 3 A false  # Desliga o interruptor A do evento 3
 *   InterruptorLocal 7 B true  # Liga o interruptor B do evento 7
 *   InterruptorLocal 13 C false  # Desliga o interruptor C do evento 13
 *   InterruptorLocaloff #Desliga todos os interruptores do mapa
 *
 * Lembrando de escolher entre A-D, a engine aceita switches locais até a 
 * letra D, mas fique a vontade para modificar o codigo se você achar melhor!
 */
//=============================================================================
// EXECUÇÃO DO CODIGO PRINCIPAL
//=============================================================================
(function() {
 
var parameters = PluginManager.parameters('Interruptores_Locais');
var gameSwitchAuto = Number(parameters['Switch Automatico'] || 0);
 
var lzo_map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    lzo_map_start.call(this);
    $gameSwitches.setValue(gameSwitchAuto, true);
    if (gameSwitchAuto > 0) {
      console.log('Switch ' + gameSwitchAuto + ' ' + 'Ligado');
    }   
};
 
var aliasPluginCommand = Game_Interpreter.prototype.pluginCommand;
 
Game_Interpreter.prototype.pluginCommand = function(command, args) {
   aliasPluginCommand.call(this, command, args);
   if (command === 'InterruptorLocal') {
      var interruptorNumero = Number(args[0]);
      var interruptorAeD = String(args[1]);
      var interruptorOnOff = eval(String(args[2]).toLowerCase());
 
      if (interruptorOnOff == true) {
        var key = [this._mapId, interruptorNumero, interruptorAeD];
        $gameSelfSwitches.setValue(key, true);           
      } else if (interruptorOnOff == false) {
        var key = [this._mapId, interruptorNumero, interruptorAeD];
        $gameSelfSwitches.setValue(key, false);     
      }
 
   }
 
   if (command === 'InterruptorLocaloff') { 
      $gameSelfSwitches.clear();
   }
 
};
 
})();
