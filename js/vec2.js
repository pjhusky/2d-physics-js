
// export 
class Vec2 {
    
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }    

    // constructor(vector_2d) {
    //     this.x = vector_2d[0];
    //     this.y = vector_2d[1];
    // }    
    
    toString() {
        //return `[]`;
        return `{"Vec2": "[${this.x}, ${this.y}]"}`;
    }
    
    toArray() {
        return new Array( this.x, this.y );
    }
    
    static add( v1, v2 ) {
        return new Vec2( v1.x+v2.x, v1.y+v2.y );
    }
    
    static sub( v1, v2 ) {
        return new Vec2( v1.x-v2.x, v1.y-v2.y );
    }
    
    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    len() {
        return Math.sqrt( this.x*this.x + this.y*this.y );
    }
    
    static len(v) {
        return Math.sqrt( v.x*v.x + v.y*v.y );
    }
    
    static dist(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        //return Math.hypot(dx, dy);
        return Math.sqrt( dx*dx + dy*dy );
    }
}

// var MyMathLib = (function (exports) {
    
//     // let Vec2 = function (x, y) {
//     //     this.x = x;
//     //     this.y = y;
//     //     };
//     // let setupTriangle = function setupTriangleFn() {
//     //     const geometry = new PIXI.Geometry()
//     //     .addAttribute('aVertexPosition', [-100, -50, 100, -50, 0, 100]);
//     //     // .addAttribute('aVertexPosition', [-1.0, -0.5, 1.0, -0.5, 0, 1.0]);


//     //     //translMat = new PIXI.Matrix().identity().translate( 2.0, 0.0);
//     //     //projMat = new PIXI.Matrix().identity();
//     //     myMat = new PIXI.Matrix().translate( 125.0, 0.0);
//     //     projMat = new PIXI.Matrix();

//     //     //console.log( myMat );
        
//     //     const uniforms = {
//     //     //uSampler2: PIXI.Texture.from('examples/assets/bg_scene_rotate.jpg'),
//     //     //time: 0,

//     //     // translationMatrix: translMat,
//     //     // //projectionMatrix: app.renderer.projectionMatrix,
//     //     //projectionMatrix: projMat,
//     //     myMat: myMat,
//     //     };
//     //     const shader = PIXI.Shader.from(
//     //     `
//     //         precision mediump float;
//     //         attribute vec2 aVertexPosition;

//     //         uniform mat3 translationMatrix; // attention: built-in!
//     //         uniform mat3 projectionMatrix;  // attention: built-in!
//     //         uniform mat3 myMat;             // user can set this

//     //         void main() {
//     //             //gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
//     //             gl_Position = vec4((projectionMatrix * myMat * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
//     //             //gl_Position = vec4((pMat * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
//     //         }
//     //     `,
//     //     `
//     //         precision mediump float;
            
//     //         void main() {
//     //             gl_FragColor = vec4(0.2, 0.8, 0.1, 1.0);
//     //         }
//     //     `,
//     //     uniforms
//     //     );

//     //     const triangle = new PIXI.Mesh(geometry, shader);

//     //     triangle.position.set(200, 300);

//     //     return triangle;
//     // };
    
//     // exports.setupTriangle = setupTriangle;
    
//     return exports;
// } )({});
