"use strict";

//export
class Input {
    // https://stackoverflow.com/questions/3691461/remove-key-press-delay-in-javascript
    // Keyboard input with customisable repeat (set to 0 for no key repeat)
    //
    //function KeyboardController(keys, repeat) {
    //constructor(document, window, keys, repeat) {
    static KeyboardController(document, window, call_site,custom_on_key_down,custom_on_key_up, keys, repeat) {
        // Lookup of key codes to timer ID, or null for no repeat
        //
        var timers = {};

        // When key is pressed and we don't already think it's pressed, call the
        // key action callback and set a timer to generate another one after a delay
        //
        document.onkeydown = function (event) {
            var key = (event || window.event).keyCode;
            if (!(key in keys))
                return true;
            if (!(key in timers)) {
                timers[key] = null;
                keys[key]();
                if (repeat !== 0)
                    timers[key] = setInterval(keys[key], repeat);
            }
            custom_on_key_down.call(call_site, key);
            return false;
        };

        // Cancel timeout and mark key as released on keyup
        //
        document.onkeyup = function (event) {
            var key = (event || window.event).keyCode;
            if (key in timers) {
                if (timers[key] !== null)
                    clearInterval(timers[key]);
                delete timers[key];
            }
            custom_on_key_up.call(call_site, key);
        };

        // When window is unfocused we may not get key events. To prevent this
        // causing a key to 'get stuck down', cancel all held keys
        //
        window.onblur = function () {
            for (key in timers)
                if (timers[key] !== null)
                    clearInterval(timers[key]);
            timers = {};
        };
    };   
}