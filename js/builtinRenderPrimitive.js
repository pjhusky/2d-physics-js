// Abstract Base Class
class BuiltinRenderPrimitive_Base {
    constructor( shape_type ) {
        if (this.constructor == BuiltinRenderPrimitive_Base ) {
            throw new Error( `Abstract class '${this.constructor.name}' can't be instantiated.`);
        }        
        this.gfx_container = new PIXI.Container();
    }

    setPivot( x, y ) {
        this.gfx_container.pivot.set( x, y );
    }
    
    setPosition( x, y ) {
        this.gfx_container.position.set( x, y );
    }
    
    setRotation( angle_rad ) {
        this.gfx_container.rotation = angle_rad;
    }
}

class BuiltinRenderPrimitive_Circle extends BuiltinRenderPrimitive_Base {
    constructor( radius, line_color_array4, fill_color_array4 ) {
        super();
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array4 );
        const line_rgb = MathUtil.rgbFloatsToHexColor( line_color_array4 );
        this.gfx_circle = new PIXI.Graphics()
            .beginFill( fill_rgb, fill_color_array4[3] )
            .lineStyle({ width: 1, color: line_rgb, alignment: 0 })
            .drawCircle(0, 0, radius)
            .endFill();

        this.gfx_container.addChild( this.gfx_circle );
    }
    
    setFillColor( fill_color_array3 ) {
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array3 );
        this.gfx_circle.tint = fill_rgb;
    }
}

class BuiltinRenderPrimitive_Polygon extends BuiltinRenderPrimitive_Base {
    
    constructor( path_xy_sequence, bounding_circle_array3, line_color_array4, fill_color_array4 ) {
        super();
        
        this.gfx_polygon = new PIXI.Graphics();
        
        // { // calc pivot
        //     const [ pivot_x, pivot_y ] = MyDrawPrimitive.calcCenterOfMassForPrimitive(path_xy_sequence);                            
        //     this.gfx_polygon.pivot.set( pivot_x, pivot_y );
        //     this.gfx_polygon.position.set( pivot_x, pivot_y );
        // }
        
        const line_width = 1.0;
        const fill_rgb = MathUtil.rgbFloatsToHexColor( fill_color_array4 );
        const line_rgb = MathUtil.rgbFloatsToHexColor( line_color_array4 );

        this.gfx_polygon.lineStyle(line_width, line_rgb, 1.0);
        this.gfx_polygon.beginFill(fill_rgb, fill_color_array4[3]);
        //fill_color += 0x512710;
        //fill_color += 0x070707;
        //fill_color = Math.random() * 255.0 * 255.0 * 255.0;
        this.gfx_polygon.drawPolygon(path_xy_sequence);
        this.gfx_polygon.endFill();
        
        this.gfx_container.addChild( this.gfx_polygon );
        
        // push normals as well
        this.gfx_edge_normals_container = new PIXI.Container();
        this.gfx_container.addChild( this.gfx_edge_normals_container );
        for ( let i = 0; i < path_xy_sequence.length; i+=2 ) {
            const curr_pt = new Vec2( path_xy_sequence[i], path_xy_sequence[i+1] );
            const j = ( i+2 ) % path_xy_sequence.length;
            const next_pt = new Vec2( path_xy_sequence[j], path_xy_sequence[j+1] );
            const edge_vec = Vec2.sub( next_pt, curr_pt );
            const mid_pt = Vec2.add( curr_pt, Vec2.mulScalar( edge_vec, 0.5 ) );
            let edge_normal_vec = new Vec2( edge_vec.y, -edge_vec.x );
            // let edge_normal_vec = new Vec2( -edge_vec.y, edge_vec.x );
            edge_normal_vec.normalize();
            //edge_normal_vec.scale(10.0);
            const edge_normal_line_gfx = new PIXI.Graphics();
            edge_normal_line_gfx.lineStyle(line_width, 0xFFFFFF, 1.0);
            //edge_normal_line_gfx.drawLine();
            edge_normal_line_gfx.moveTo(mid_pt.x, mid_pt.y);
            const display_scale = 10.0;
            edge_normal_line_gfx.lineTo(mid_pt.x + edge_normal_vec.x * display_scale, mid_pt.y + edge_normal_vec.y * display_scale);
            this.gfx_edge_normals_container.addChild( edge_normal_line_gfx );
        }
        
        this.gfx_bounding_circle = new PIXI.Graphics()
            .beginFill( 0x7F7F7F, 0.15 )
            .lineStyle({ width: 1, color: 0xFFFFFF, alignment: 0 })
            .drawCircle(0, 0, bounding_circle_array3[1])
            //.drawCircle(0, 0, 70.0)
            .endFill();
        this.gfx_bounding_circle.position.set( bounding_circle_array3[0][0], bounding_circle_array3[0][1] );

        this.gfx_container.addChild( this.gfx_bounding_circle );
    }
}