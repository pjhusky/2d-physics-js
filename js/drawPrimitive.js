
var MyDrawPrimitive = (function (exports) {

    let calcPivotForPrimitive = function calcPivotForPrimitiveFn( vertex_positions_plot ) {

        let pivot_x = 0.0;
        for ( let x = 0; x < vertex_positions_plot.length - 1; x += 2 ) {
            pivot_x += vertex_positions_plot[x];
        } 
        let pivot_y = 0.0;
        for ( let y = 1; y < vertex_positions_plot.length; y += 2 ) {
            pivot_y += vertex_positions_plot[y];
        } 
        pivot_x /= 0.5 * vertex_positions_plot.length;
        pivot_y /= 0.5 * vertex_positions_plot.length;
        
        return [ pivot_x, pivot_y ];
    }
    
    let defaultVertexSource = function defaultVertexSourceFn() {
        const vertexSrc = `
            precision mediump float;
            attribute vec2 aVertexPosition;
            attribute vec2 aUvs;
            uniform mat3 translationMatrix;
            uniform mat3 projectionMatrix;
            uniform mat3 u_viewMatrix;
            varying vec2 vUvs;
            void main() {
                vUvs = aUvs;
                gl_Position = vec4((projectionMatrix * u_viewMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            }`;
        return vertexSrc;
    }
    
    let defaultFragmentSource = function defaultFragmentSourceFn() {
        const fragmentSrc = `
            precision mediump float;
            varying vec2 vUvs;
            uniform sampler2D u_Sampler2;
            uniform float u_time;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
                //gl_FragColor = u_color * texture2D(u_Sampler2, vUvs + sin( (u_time + (vUvs.x) * 14.) ) * 0.1 );
            }`;
        return fragmentSrc;        
    }

    let setupCircle = function setupCircleFn( center_point, radius, num_segments ) {
        
        let vertex_positions = [];
        let tex_coords = [];
        if ( num_segments == undefined || num_segments <= 0 ) { num_segments = 20.0; }
        
        console.log( `num_segments = ${num_segments}` );
        
        const segment_step = 2.0 * Math.PI / num_segments;
        for ( let i = 0; i < 2.0 * Math.PI; i += segment_step ) {
            const cos_i = Math.cos( i );
            const sin_i = Math.sin( i );
            vertex_positions.push( center_point[0] + cos_i * radius );
            vertex_positions.push( center_point[1] + sin_i * radius );
            // vertex_positions.push( cos_i * radius );
            // vertex_positions.push( sin_i * radius );
            tex_coords.push( cos_i * 0.5 + 0.5 );
            tex_coords.push( sin_i * 0.5 + 0.5 );
        }
        
        // just return setupPolygon() with the calculated vertex positions, as we basically render the circle as a convex polygon
        return this.setupPolygon( vertex_positions, tex_coords );
        
    }
    
    
    let setupTriangle = function setupTriangleFn( ccw_p0, ccw_p1, ccw_p2 ) {
        
        let vertex_positions = [  
            // -100, -100, // x, y
            // 100, -100, // x, y
            // 0, 100 // x, y
            ccw_p0[0], ccw_p0[1], // x, y
            ccw_p1[0], ccw_p1[1], // x, y
            ccw_p2[0], ccw_p2[1], // x, y
        ];
        const [ pivot_x, pivot_y ] = calcPivotForPrimitive( vertex_positions );

        const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', // the attribute name
            vertex_positions, // x, y
            2) // the size of the attribute
        .addAttribute('aUvs', // the attribute name
            [   0, 0, // u, v
                1, 0, // u, v
                0.5, 1], // u, v
            2) // the size of the attribute
        .addIndex([0, 1, 2]);
    
        const vertexSrc = defaultVertexSource();
        const fragmentSrc = defaultFragmentSource();
        
        viewMat3 = new PIXI.Matrix();
        //viewMat3.rotate( Math.PI * 0.33 );
        //viewMat3.translate( -200.0, 0.0 );
            
        const uniforms = {
            
            u_viewMatrix: viewMat3,
            //uSampler2: PIXI.Texture.from('examples/assets/bg_scene_rotate.jpg'),
            u_Sampler2: PIXI.Texture.from('assets/flowerTop.png'),
            u_color: [0.5,0.0,0.0,0.5],
            u_time: 0,
        };
        
        const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
        
        const triangle = new PIXI.Mesh(geometry, shader);
        
        triangle.pivot.set( pivot_x, pivot_y );
        triangle.position.set( pivot_x, pivot_y );
        
        return triangle;
    }
        
    // https://pixijs.io/examples/#/mesh-and-shaders/uniforms.js
    let setupQuad = function setupQuadFn( ccw_p0, ccw_p1, ccw_p2, ccw_p3 ) {
        
        const vertex_positions = [
            ccw_p0[0], ccw_p0[1], // x, y
            ccw_p1[0], ccw_p1[1], // x, y
            ccw_p2[0], ccw_p2[1], // x, y
            ccw_p3[0], ccw_p3[1], // x, y
        ];
        
        const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', // the attribute name
            vertex_positions, // x, y
            2) // the size of the attribute
        .addAttribute('aUvs', // the attribute name
            [0, 0, // u, v
                1, 0, // u, v
                1, 1,
                0, 1], // u, v
            2) // the size of the attribute
        .addIndex([0, 1, 2, 0, 2, 3]);
    
        const vertexSrc = defaultVertexSource();
        const fragmentSrc = defaultFragmentSource();
        
        const uniforms = {
            uSampler2: PIXI.Texture.from('assets/flowerTop.png'),
            time: 0,
        };
        
        const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
        
        const quad = new PIXI.Mesh(geometry, shader);

        const [ pivot_x, pivot_y ] = calcPivotForPrimitive( vertex_positions );
        quad.pivot.set( pivot_x, pivot_y );
        quad.position.set( pivot_x, pivot_y );
        
        return quad;
    }

    
    let setupPolygon = function setupPolygonFn( vertex_positions, texture_coords/*, indices*/ ) {
        const indices = [...Array(vertex_positions.length/2).keys()];
        
        // TODO - map from vertex pos to relative vertex pos wrt bounding box and use those for tex coords instead...
        if ( texture_coords == undefined || texture_coords.length == 0 ) {
            texture_coords = vertex_positions;
        }
        
        const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', // the attribute name
            vertex_positions, // x, y
            2 ) // the size of the attribute (2D positions)
        .addAttribute('aUvs', // the attribute name
            texture_coords, // u, v
            2 ) // the size of the attribute (2D texture coordinates)
        .addIndex(indices);
    
        const vertexSrc = defaultVertexSource();
        const fragmentSrc = defaultFragmentSource();
        
        viewMat3 = new PIXI.Matrix();
            
        const uniforms = {
            u_viewMatrix: viewMat3,
            u_Sampler2: PIXI.Texture.from('assets/flowerTop.png'),
            u_color: [0.5,0.0,0.0,0.5],
            u_time: 0,
        };
        
        const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
        
        const polygon = new PIXI.Mesh(geometry, shader);
        
        const [ pivot_x, pivot_y ] = calcPivotForPrimitive( vertex_positions );
        polygon.pivot.set( pivot_x, pivot_y );
        polygon.position.set( pivot_x, pivot_y );

        polygon.drawMode = PIXI.DRAW_MODES.TRIANGLE_FAN;
        
        return polygon;
    }
    
    exports.calcPivotForPrimitive = calcPivotForPrimitive;
    exports.setupCircle = setupCircle;
    exports.setupTriangle = setupTriangle;
    exports.setupQuad = setupQuad;
    exports.setupPolygon = setupPolygon;
    
    return exports;
} )({});