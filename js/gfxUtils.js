"use strict";

class GfxUtils {
    
    constructor( app ) {
        this.app = app;
        this.render_textures_with_desc = [];
    }
    
    getCircleRenderTexture( radius, with_outline ) { 
        for ( let i = 0; i < this.render_textures_with_desc.length; i++ ) {
            if ( this.render_textures_with_desc[i].desc.radius == radius &&
                 this.render_textures_with_desc[i].desc.with_outline == with_outline ) {
                    return this.render_textures_with_desc[i].render_tex;
            }
        }
        
        let templateShape = null;
        if ( with_outline ) {
            templateShape = new PIXI.Graphics()
                .beginFill(0xffffff)
                .lineStyle({ width: 1, color: 0x333333, alignment: 0 })
                .drawCircle( 0, 0, radius );
        } else {
            templateShape = new PIXI.Graphics()
                .beginFill( 0xffffff )
                .drawCircle( 0, 0, radius );
        }    
            
        let { width, height } = templateShape;
        
        // Draw the circle to the RenderTexture
        let outlinedCircleRT = PIXI.RenderTexture.create({
            width,
            height,
            //multisample: MSAA_QUALITY.HIGH,
            resolution: window.devicePixelRatio
        });
        // With the existing renderer, render texture
        // make sure to apply a transform Matrix
        this.app.renderer.render(templateShape, {
            renderTexture: outlinedCircleRT,
            transform: new PIXI.Matrix(1, 0, 0, 1, width / 2, height / 2)
        });
        
        // Required for MSAA, WebGL 2 only
        //app.renderer.framebuffer.blit();

        // Discard the original Graphics
        templateShape.destroy(true);
        
        this.render_textures_with_desc.push(
            { desc: { radius: radius, with_outline: with_outline },
              render_tex: outlinedCircleRT }
        );
        return outlinedCircleRT;
    }		

}