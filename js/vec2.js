"use strict";

import * as MathUtil from './mathUtil.js';

export
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
    static toArray( vec ) {
        return vec.toArray();
    }
    
    static fromArray( vec2_as_array ) {
        return new Vec2( vec2_as_array[0], vec2_as_array[1] );
    }
    
    static add( v1, v2 ) {
        return new Vec2( v1.x+v2.x, v1.y+v2.y );
    }
    add( other ) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    static sub( v1, v2 ) {
        return new Vec2( v1.x-v2.x, v1.y-v2.y );
    }
    sub( other ) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    
    static mulScalar( v, s ) {
        return new Vec2( v.x * s, v.y * s );
    }
    mulScalar( s ) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    
    static normalize( v ) {
        return v.normalize();
    }
    normalize() {
        const len_recip = 1.0 / this.len();
        return this.scale( len_recip );
    }
    normalizeSafe() {
        const div_len = Math.max( MathUtil.f32_Eps(), this.len() );
        const len_recip = 1.0 / div_len;
        return this.scale( len_recip );
    }
    
    static det( v1, v2 ) {
        return v1.x * v2.y - v1.y * v2.x;
    }    
    det( v ) {
        return Vec2.det( this, v );
    }
    
    static cross2( v1, v2 ) {
        return Vec2.det( v1, v2 );
    }
    cross2( v ) {
        return Vec2.det( this, v );
    }
    
    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    

    lenSquared() {
        return ( this.x*this.x + this.y*this.y );
    }
    len() {
        return Math.sqrt( this.lenSquared() );
    }
    
    static lenSquared(v) {
        return ( v.x*v.x + v.y*v.y );
    }
    static len(v) {
        return Math.sqrt( this.lenSquared(v) );
    }
    
    static distSquared(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return ( dx*dx + dy*dy );
    }
    
    static dist(v1, v2) {
        //return Math.hypot(dx, dy);
        return Math.sqrt( this.distSquared(v1,v2) );
    }
    
    static dot( v1, v2 ) {
        return ( v1.x * v2.x + v1.y * v2.y );
    }
    dot( v ) {
        return ( this.x * v.x + this.y * v.y );
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
