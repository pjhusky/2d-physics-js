
var MyDrawPrimitive = (function (exports) {

    let setupTriangle = function setupTriangleFn( ccw_p0, ccw_p1, ccw_p2 ) {
        const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', // the attribute name
            [  
                // -100, -100, // x, y
                // 100, -100, // x, y
                // 0, 100 // x, y
                ccw_p0[0], ccw_p0[1], // x, y
                ccw_p1[0], ccw_p1[1], // x, y
                ccw_p2[0], ccw_p2[1], // x, y
            ], // x, y
            2) // the size of the attribute
        .addAttribute('aUvs', // the attribute name
            [   0, 0, // u, v
                1, 0, // u, v
                0.5, 1], // u, v
            2) // the size of the attribute
        .addIndex([0, 1, 2]);
    
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
        
        //triangle.position.set(400, 300);
        //triangle.scale.set(2);        
        
        return triangle;
    }
        
    // https://pixijs.io/examples/#/mesh-and-shaders/uniforms.js
    // let setupQuad = function setupQuadFn( ccw_p0, ccw_p1, ccw_p2, ccw_p3 ) {
        
    //     const geometry = new PIXI.Geometry()
    //     .addAttribute('aVertexPosition', // the attribute name
    //         [
    //             // -100, -100, // x, y
    //             // 100, -100, // x, y
    //             // 100, 100, // x, y
    //             // -100, 100 // x, y
    //             ccw_p0[0], ccw_p0[1], // x, y
    //             ccw_p1[0], ccw_p1[1], // x, y
    //             ccw_p2[0], ccw_p2[1], // x, y
    //             ccw_p3[0], ccw_p3[1], // x, y
    //         ], // x, y
    //         2) // the size of the attribute
    //     .addAttribute('aUvs', // the attribute name
    //         [0, 0, // u, v
    //             1, 0, // u, v
    //             1, 1,
    //             0, 1], // u, v
    //         2) // the size of the attribute
    //     .addIndex([0, 1, 2, 0, 2, 3]);
    
    //     const vertexSrc = `
        
    //         precision mediump float;
        
    //         attribute vec2 aVertexPosition;
    //         attribute vec2 aUvs;
        
    //         uniform mat3 translationMatrix;
    //         uniform mat3 projectionMatrix;
        
    //         varying vec2 vUvs;
        
    //         void main() {
        
    //             vUvs = aUvs;
    //             gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        
    //         }`;
        
    //     const fragmentSrc = `
        
    //         precision mediump float;
        
    //         varying vec2 vUvs;
        
    //         uniform sampler2D uSampler2;
    //         uniform float time;
        
    //         void main() {
        
    //             gl_FragColor = texture2D(uSampler2, vUvs + sin( (time + (vUvs.x) * 14.) ) * 0.1 );
    //         }`;
        
    //     const uniforms = {
    //         //uSampler2: PIXI.Texture.from('examples/assets/bg_scene_rotate.jpg'),
    //         uSampler2: PIXI.Texture.from('assets/flowerTop.png'),
    //         time: 0,
    //     };
        
    //     const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
        
    //     const quad = new PIXI.Mesh(geometry, shader);
        
    //     quad.position.set(400, 300);
    //     quad.scale.set(2);        
        
    //     return quad;
    // }

    
    
    let setupPolygon = function setupPolygonFn( vertex_positions, texture_coords, indices ) {
        const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', // the attribute name
            vertex_positions, // x, y
            2 ) // the size of the attribute (2D positions)
        .addAttribute('aUvs', // the attribute name
            texture_coords, // u, v
            2 ) // the size of the attribute (2D texture coordinates)
        .addIndex(indices);
    
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
        
        const polygon = new PIXI.Mesh(geometry, shader);
        
        //polygon.position.set(400, 300);
        
        { // calc pivot
            let pivot_x = 0.0;
            for ( let x = 0; x < vertex_positions.length - 1; x += 2 ) {
                pivot_x += vertex_positions[x];
            } 
            let pivot_y = 0.0;
            for ( let y = 1; y < vertex_positions.length; y += 2 ) {
                pivot_y += vertex_positions[y];
            } 
            pivot_x /= 0.5 * vertex_positions.length;
            pivot_y /= 0.5 * vertex_positions.length;
            
            polygon.pivot.set( pivot_x, pivot_y );
            polygon.position.set( pivot_x, pivot_y );
        }
        
        
        return polygon;
    }
    

    exports.setupTriangle = setupTriangle;
    //exports.setupQuad = setupQuad;
    exports.setupPolygon = setupPolygon;
    
    return exports;
} )({});