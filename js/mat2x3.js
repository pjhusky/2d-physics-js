"use strict";

//import { Vec2 } from './vec2.js';
// import { MathUtil } from './mathUtil.js';

//export
class Mat2x3 {
    constructor() {
        //this.m = undefined;
        this.m = [];
        this.setIdentity();
    }

    // fromColumnVectors( col0,col1, col2 ) {
    // }
    
    setIdentity() {
        let column0 = new Vec2( 1.0, 0.0 );
        let column1 = new Vec2( 0.0, 1.0 );
        let column2 = new Vec2( 0.0, 0.0 ); // translation
        this.m = new Array( column0, column1, column2 );
    }
    
    setTranslation( x, y ) {
        let column0 = new Vec2( 1.0, 0.0 );
        let column1 = new Vec2( 0.0, 1.0 );
        let column2 = new Vec2( x, y ); // translation
        this.m = new Array( column0, column1, column2 );
    }
    
    setRotation( angle_rad ) {
        const c = Math.cos( angle_rad );
        const s = Math.sin( angle_rad );
        let column0 = new Vec2(  c, s );
        let column1 = new Vec2( -s, c );
        let column2 = new Vec2( 0.0, 0.0 ); // translation
        this.m = new Array( column0, column1, column2 );
    }
    
    static createIdentity() {
        let matrix = new Mat2x3();
        matrix.setIdentity();
        return matrix;
    }

    static createTranslation( x, y ) {
        let matrix = new Mat2x3();
        matrix.setTranslation( x, y );
        return matrix;
    }
    
    static createRotation( angle_rad ) {
        let matrix = new Mat2x3();
        matrix.setRotation( angle_rad);
        return matrix;
    }
        
    static mulMat( ml, mr ) {
        let ret = new Mat2x3();
        
        const c0l = ml.m[0];
        const c1l = ml.m[1];
        const c2l = ml.m[2];

        const c0r = mr.m[0];
        const c1r = mr.m[1];
        const c2r = mr.m[2];
        
        const m00 = c0l.x*c0r.x + c1l.x*c0r.y;
        const m01 = c0l.x*c1r.x + c1l.x*c1r.y;
        const m02 = c0l.x*c2r.x + c1l.x*c2r.y + c2l.x;
        
        const m10 = c0l.y*c0r.x + c1l.y*c0r.y;
        const m11 = c0l.y*c1r.x + c1l.y*c1r.y;
        const m12 = c0l.y*c2r.x + c1l.y*c2r.y + c2l.y;
        
        let column0 = new Vec2( m00, m10 );
        let column1 = new Vec2( m01, m11 );
        let column2 = new Vec2( m02, m12 ); // translation
        
        ret.m = new Array( column0, column1, column2 );
        
        return ret;
    }
    
    static mulDirVector( mat, v ) {
        const mc0 = mat.m[0];
        const mc1 = mat.m[1];
        const mc2 = mat.m[2];
        
        return new Vec2( mc0.x * v.x + mc1.x * v.y, mc0.y * v.x + mc1.y * v.y );
    }
    
    static mulPosition( mat, p ) {
        const mc0 = mat.m[0];
        const mc1 = mat.m[1];
        const mc2 = mat.m[2];
        
        return new Vec2( mc0.x * p.x + mc1.x * p.y + mc2.x, mc0.y * p.x + mc1.y * p.y + mc2.y );
    }
    
}