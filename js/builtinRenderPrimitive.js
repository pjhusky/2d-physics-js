"use strict";

// import { Vec2 } from './vec2.js';
// import { MathUtil } from './mathUtil.js';

// Abstract Base Class
class BuiltinRenderPrimitive_Base {
    constructor( line_color_array4, fill_color_array4 ) {
        if (this.constructor == BuiltinRenderPrimitive_Base ) {
            throw new Error( `Abstract class '${this.constructor.name}' can't be instantiated.`);
        }        
        
        this.gfx_container = new PIXI.Container();
        this.gfx_debug_vis_container = new PIXI.Container();
        this.gfx_debug_vis_container.visible = false;
        
        this.fill_color_array4 = fill_color_array4;
        this.line_color_array4 = line_color_array4;
        
        this.gfx_container.addChild( this.gfx_debug_vis_container );
    }
 
    addLabel( text ) {
        const gfx_text = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xAAAAAA,
            align: 'center',
        });
        gfx_text.position.set( -6.0, 6.0 );
        // const gfx_text = new PIXI.BitmapText('text using a fancy font!', {
        //     fontName: 'Arial',
        //     fontSize: 35,
        //     align: 'right',
        // });        
        this.gfx_container.addChild( gfx_text );
        //this.gfx_debug_vis_container.addChild( gfx_text );
    }
    
    setPivot( x, y ) {
        this.gfx_container.pivot.set( x, y );
        //this.gfx_debug_vis_container.pivot.set( x, y );
    }
    
    setPosition( x, y ) {
        this.gfx_container.position.set( x, y );
        //this.gfx_debug_vis_container.position.set( x, y );
    }
    
    setRotation( angle_rad ) {
        this.gfx_container.rotation = angle_rad;
        //this.gfx_debug_vis_container.rotation = angle_rad;
    }
    
    setDebugInfoVisibility( flag ) { 
        this.gfx_debug_vis_container.visible = flag; 
    }
}

//export
class BuiltinRenderPrimitive_Circle extends BuiltinRenderPrimitive_Base {
    constructor( radius, line_color_array4, fill_color_array4 ) {
        super(line_color_array4, fill_color_array4);
        
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array4 );
        const line_rgb = MathUtil.rgbFloatsToHexColor( line_color_array4 );
        
        this.radius = radius;
        this.gfx_circle = new PIXI.Graphics()
            .beginFill( fill_rgb, this.fill_color_array4[3] )
            .lineStyle({ width: 1, color: line_rgb, alignment: 0 })
            .drawCircle(0, 0, radius)
            .endFill();
        this.gfx_container.addChild( this.gfx_circle );
        
        this.gfx_center_circle = new PIXI.Graphics()
            .beginFill( fill_rgb, 0xFFFFFF - fill_color_array4[3] )
            .lineStyle({ width: 1.25, color: 0xFFFFFF, alignment: 0 })
            .drawCircle(0, 0, 3.5)
            .endFill();
        this.gfx_debug_vis_container.addChild( this.gfx_center_circle );            

        this.gfx_angle_vis = new PIXI.Graphics();
        const line_width = 4.0;
        this.gfx_angle_vis.lineStyle(line_width, 0x66AA66, 4.0);
        const pt_x = 0.0;
        const pt_y = 0.0;
        this.gfx_angle_vis.moveTo(pt_x, pt_y);
        this.gfx_angle_vis.lineTo(pt_x + radius, pt_y);
        
        this.gfx_debug_vis_container.addChild( this.gfx_angle_vis );            
    }
    
    resetFillColor() {
        this.gfx_circle.tint = 0xFFFFFF;
        this.gfx_circle.alpha = 1.0;
    }
    
    setFillColor( fill_color_array4 ) {
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array4 );
        this.gfx_circle.tint = fill_rgb;
        this.gfx_circle.alpha = fill_color_array4[3];
    }
    
}

//export
class BuiltinRenderPrimitive_Polygon extends BuiltinRenderPrimitive_Base {
    
    constructor( path_xy_sequence, bounding_circle_array3, line_color_array4, fill_color_array4 ) {
        super( line_color_array4, fill_color_array4 );

        const line_width = 1.0;
        this.gfx_polygon = this.gfxPolygonFromPoints( path_xy_sequence, line_width );
        
        // push normals as well
        this.gfx_edge_normals_container = new PIXI.Container();
        this.gfx_debug_vis_container.addChild( this.gfx_edge_normals_container );
        for ( let i = 0; i < path_xy_sequence.length; i+=2 ) {
            const curr_pt = new Vec2( path_xy_sequence[i], path_xy_sequence[i+1] );
            const j = ( i+2 ) % path_xy_sequence.length;
            const next_pt = new Vec2( path_xy_sequence[j], path_xy_sequence[j+1] );
            const edge_vec = Vec2.sub( next_pt, curr_pt );
            const mid_pt = Vec2.add( curr_pt, Vec2.mulScalar( edge_vec, 0.5 ) );
            let edge_normal_vec = new Vec2( edge_vec.y, -edge_vec.x );
            edge_normal_vec.normalize();
            const edge_normal_line_gfx = new PIXI.Graphics();
            edge_normal_line_gfx.lineStyle(line_width, 0xFFFFFF, 1.0);
            edge_normal_line_gfx.moveTo(mid_pt.x, mid_pt.y);
            const display_scale = 10.0;
            edge_normal_line_gfx.lineTo(mid_pt.x + edge_normal_vec.x * display_scale, mid_pt.y + edge_normal_vec.y * display_scale);
            this.gfx_edge_normals_container.addChild( edge_normal_line_gfx );
        }
        
        this.gfx_bounding_circle = new PIXI.Graphics()
            .beginFill( 0x7F7F7F, 0.15 )
            .lineStyle({ width: 1, color: 0xFFFFFF, alignment: 0 })
            .drawCircle(0, 0, bounding_circle_array3[1])
            .endFill();
        this.gfx_bounding_circle.position.set( bounding_circle_array3[0][0], bounding_circle_array3[0][1] );

        this.gfx_bounding_circle_center = new PIXI.Graphics()
            .beginFill( 0x7F7F7F, 0.15 )
            .lineStyle({ width: 1, color: 0xFFFFFF, alignment: 0 })
            .drawCircle(0, 0, 3.5)
            .endFill();
        this.gfx_bounding_circle_center.position.set( bounding_circle_array3[0][0], bounding_circle_array3[0][1] );

        this.gfx_center_of_mass = new PIXI.Graphics()
            .beginFill( 0x227F22, 0.15 )
            .lineStyle({ width: 1, color: 0x66FF66, alignment: 0 })
            .drawCircle(0, 0, 3.5)
            .endFill();
        this.gfx_center_of_mass.position.set( 0.0, 0.0 );
        
        // this.gfx_container.addChild( this.gfx_bounding_circle );
        // this.gfx_container.addChild( this.gfx_bounding_circle_center );
        // this.gfx_container.addChild( this.gfx_center_of_mass );

        this.gfx_debug_vis_container.addChild( this.gfx_bounding_circle );
        this.gfx_debug_vis_container.addChild( this.gfx_bounding_circle_center );
        this.gfx_debug_vis_container.addChild( this.gfx_center_of_mass );
    }
    
    gfxPolygonFromPoints( path_xy_sequence, line_width ) {
        if ( this.gfx_polygon ) {
            //this.gfx_container.removeChild(this.gfx_polygon);
            this.gfx_polygon.destroy();
        }
        this.gfx_polygon = new PIXI.Graphics();

        const fill_rgb = MathUtil.rgbFloatsToHexColor( this.fill_color_array4 );
        const line_rgb = MathUtil.rgbFloatsToHexColor( this.line_color_array4 );

        this.gfx_polygon.lineStyle(line_width, line_rgb, 1.0);
        this.gfx_polygon.beginFill(fill_rgb, this.fill_color_array4[3]);
        this.gfx_polygon.drawPolygon(path_xy_sequence);
        this.gfx_polygon.endFill();
        
        this.gfx_container.addChild( this.gfx_polygon );
        return this.gfx_polygon;
    }
    
    resetFillColor() {
        this.gfx_polygon.tint = 0xFFFFFF;
        this.gfx_polygon.alpha = 1.0;
    }
    
    setFillColor( fill_color_array4 ) {
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array4 );
        this.gfx_polygon.tint = fill_rgb;
        this.gfx_polygon.alpha = fill_color_array4[3];
    }
   
}
