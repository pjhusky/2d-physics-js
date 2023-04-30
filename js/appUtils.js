var AppUtils = (function (exports) {

    let BrowserEnum = class BrowserEnumClass {
        constructor() {
            // // Opera 8.0+
            this.isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
            // // Firefox 1.0+
            this.isFirefox = typeof InstallTrigger !== 'undefined';
            // // Safari 3.0+ "[object HTMLElementConstructor]" 
            this.isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
            // // Internet Explorer 6-11
            this.isIE = /*@cc_on!@*/false || !!document.documentMode;
            // // Edge 20+
            this.isEdge = !this.isIE && !!window.StyleMedia;
            // // Chrome 1 - 79
            // this.isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
            // // Edge (based on chromium) detection
            // this.isEdgeChromium = this.isChrome && (navigator.userAgent.indexOf("Edg") != -1);
            // // Blink engine detection
            // this.isBlink = (this.isChrome || this.isOpera) && !!window.CSS;

            //this.isFirefox = typeof InstallTrigger !== 'undefined';
            // this.isChromium = window.chrome;
            var winNav = window.navigator;
            var vendorName = winNav.vendor;
            // //this.isOpera = typeof window.opr !== "undefined";
            this.isIEedge = winNav.userAgent.indexOf("Edg") > -1;
            // this.isIOSChrome = winNav.userAgent.match("CriOS");

            // if ( !this.isChrome ) {
            //     if (this.isIOSChrome) {
            //         // is Google Chrome on IOS
            //         this.isIOSChrome = true;
            //     } else if(
            //         this.isChromium !== null &&
            //         typeof isChromium !== "undefined" &&
            //         vendorName === "Google Inc." &&
            //         this.isOpera === false &&
            //         this.isIEedge === false
            //     ) {
            //         // is Google Chrome
            //         this.isChrome = true;
            //     } else { 
            //         // not Google Chrome 
            //     }
            // }
            // const latestChrome = 111.1; //latest stable chrome version
            // const currentChrome = Number(window.navigator.userAgentData.brands[0].version)
            if(navigator.userAgent.includes("Chrome")){
                this.isChrome = true;
            }
            
            if(navigator.userAgent.includes("Firefox")){
                this.isFirefox = true;
            }
                            
            var output = 'Detecting browsers by ducktyping:\n';
            output += 'isFirefox: ' + this.isFirefox + '\n';
            output += 'isChrome: ' + this.isChrome + '\n';
            output += 'isSafari: ' + this.isSafari + '\n';
            output += 'isOpera: ' + this.isOpera + '\n';
            output += 'isIE: ' + this.isIE + '\n';
            output += 'isEdge: ' + this.isEdge + '\n';
            output += 'isEdgeChromium: ' + this.isEdgeChromium + '\n';
            output += 'isBlink: ' + this.isBlink + '\n';
            //document.body.innerHTML = output;
            console.log( output );
        }
    };
    exports.BrowserEnum = BrowserEnum;
    
    // Clamp number between two values with the following line:
    exports.clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    
    exports.takeScreenshot = async function takeScreenshotFn() {
        app.stop();
        const url = await app.renderer.extract.base64(app.stage);
        const a = document.createElement('a');
        document.body.append(a);
        a.download = 'screenshot';
        a.href = url;
        a.click();
        a.remove();
        app.start();
    };

       
    // function downloadToFile(content, filename, contentType) {
    //     console.log( 'in downloadToFile!' );
    //     const a = document.createElement('a');
    //     const file = new Blob([content], {type: contentType});
        
    //     a.href= URL.createObjectURL(file);
    //     a.download = filename;
    //     a.click();

    //     URL.revokeObjectURL(a.href);
    // }

    // function downloadAsPng(fileName) {
    //     // this.app.renderer.plugins.extract.canvas(this.container).toBlob(function (b) {
    //     //     var a = document.createElement("a");
    //     //     document.body.append(a);
    //     //     a.download = fileName;
    //     //     a.href = URL.createObjectURL(b);
    //     //     a.click();
    //     //     a.remove();
    //     // }
    // }
    
    // https://github.com/kittykatattack/scaleToWindow
    exports.scaleToWindow = function scaleToWindowFn(canvas, backgroundColor) {
        var scaleX, scaleY, scale, center;

        //1. Scale the canvas to the correct size
        //Figure out the scale amount on each axis
        scaleX = window.innerWidth / canvas.offsetWidth;
        scaleY = window.innerHeight / canvas.offsetHeight;

        //Scale the canvas based on whichever value is less: `scaleX` or `scaleY`
        scale = Math.min(scaleX, scaleY);
        canvas.style.transformOrigin = "0 0";
        canvas.style.transform = "scale(" + scale + ")";

        //2. Center the canvas.
        //Decide whether to center the canvas vertically or horizontally.
        //Wide canvases should be centered vertically, and 
        //square or tall canvases should be centered horizontally
        if (canvas.offsetWidth > canvas.offsetHeight) {
            if (canvas.offsetWidth * scale < window.innerWidth) {
                center = "horizontally";
            } else {
                center = "vertically";
            }
        } else {
            if (canvas.offsetHeight * scale < window.innerHeight) {
                center = "vertically";
            } else {
                center = "horizontally";
            }
        }

        //Center horizontally (for square or tall canvases)
        var margin;
        if (center === "horizontally") {
            margin = (window.innerWidth - canvas.offsetWidth * scale) / 2;
            canvas.style.marginTop = 0 + "px";
            canvas.style.marginBottom = 0 + "px";
            canvas.style.marginLeft = margin + "px";
            canvas.style.marginRight = margin + "px";
        }

        //Center vertically (for wide canvases) 
        if (center === "vertically") {
            margin = (window.innerHeight - canvas.offsetHeight * scale) / 2;
            canvas.style.marginTop = margin + "px";
            canvas.style.marginBottom = margin + "px";
            canvas.style.marginLeft = 0 + "px";
            canvas.style.marginRight = 0 + "px";
        }

        //3. Remove any padding from the canvas  and body and set the canvas
        //display style to "block"
        canvas.style.paddingLeft = 0 + "px";
        canvas.style.paddingRight = 0 + "px";
        canvas.style.paddingTop = 0 + "px";
        canvas.style.paddingBottom = 0 + "px";
        canvas.style.display = "block";

        //4. Set the color of the HTML body background
        document.body.style.backgroundColor = backgroundColor;

        //Fix some quirkiness in scaling for Safari
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("safari") != -1) {
            if (ua.indexOf("chrome") > -1) {
                // Chrome
            } else {
                // Safari
                //canvas.style.maxHeight = "100%";
                //canvas.style.minHeight = "100%";
            }
        }

        //5. Return the `scale` value. This is important, because you'll nee this value 
        //for correct hit testing between the pointer and sprites
        return scale;
    };
    
    exports.keyboard = function keyboardFn(value) {
        const key = {};
        key.value = value;
        key.isDown = false;
        key.isUp = true;
        key.press = undefined;
        key.release = undefined;
        //The `downHandler`
        key.downHandler = (event) => {
            if (event.key === key.value) {
            if (key.isUp && key.press) {
                key.press();
            }
            key.isDown = true;
            key.isUp = false;
            event.preventDefault();
            }
        };

        //The `upHandler`
        key.upHandler = (event) => {
            if (event.key === key.value) {
            if (key.isDown && key.release) {
                key.release();
            }
            key.isDown = false;
            key.isUp = true;
            event.preventDefault();
            }
        };

        //Attach event listeners
        const downListener = key.downHandler.bind(key);
        const upListener = key.upHandler.bind(key);
        
        window.addEventListener("keydown", downListener, false);
        window.addEventListener("keyup", upListener, false);
        
        // Detach event listeners
        key.unsubscribe = () => {
            window.removeEventListener("keydown", downListener);
            window.removeEventListener("keyup", upListener);
        };
        
        return key;
    };

    let componentToHex = function componentToHexFn(comp) {
        var hex = comp.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    exports.componentToHex = componentToHex;

    exports.rgbToHex = function rgbToHexFn(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    };

    return exports;
    
} )({});