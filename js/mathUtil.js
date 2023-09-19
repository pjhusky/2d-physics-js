"use strict";

//import { Vec2 } from './vec2.js';

//export
class MathUtil {

    static startRandomSeed() { return 75921; }
    static DeterministicRandom = {
        //return {
            // const startRandomSeed = 75921;
            // let seed = startRandomSeed;
            // let mulberry_a = 7321;

            seed:   this.startRandomSeed(),
            mulberry_a: 7321,
            
            mulberry32: function() {
                let t = this.mulberry_a += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            },
            
            randomSin: function() {
                let x = Math.sin(this.seed++) * 10000;
                return x - Math.floor(x);
            }          
        //}
    }       
    
    static DeterministicRandom2() {
        return {
            // const startRandomSeed = 75921;
            // let seed = startRandomSeed;
            // let mulberry_a = 7321;

            seed:   this.startRandomSeed(),
            mulberry_a: 7321,
            
            mulberry32: function() {
                let t = this.mulberry_a += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            },
            
            randomSin: function() {
                let x = Math.sin(this.seed++) * 10000;
                return x - Math.floor(x);
            }          
        }
    }       
    
    // static mulberry32(mulberry_a) {
	// 	return function() {
	// 	let t = mulberry_a += 0x6D2B79F5;
	// 	t = Math.imul(t ^ t >>> 15, t | 1);
	// 	t ^= t + Math.imul(t ^ t >>> 7, t | 61);
	// 	return ((t ^ t >>> 14) >>> 0) / 4294967296;
	// 	}
	// }

    
    // adapted from https://stackoverflow.com/questions/23615299/how-to-specify-float32-limits-in-javascript
    static f32_LargestPosVal() { return  3.40282347e+38; } // largest positive number in float32
    static f32_LargestNegVal() { return -3.40282347e+38; } // largest negative number in float32
    static f32_Eps()           { return  1.175494351e-38; } // smallest number in float32

    static isApproxEqual( x, y ) {
        // const zero_tolerance = 0.0000001;
        const zero_tolerance = 0.00001;
        return ( Math.abs( x - y ) < zero_tolerance );
    }
    
    //static normalizedFloatToByte( 
    static rgbFloatsToHexColor( float_array ) {
        //return ( ( ( ( float_array[0] * 255.0 + float_array[1] ) * 255.0 + float_array[2] ) * 255.0 ) & 0xFFFFFF );
        //return ( ( float_array[0] * 255.0 * 256.0*256.0 + float_array[1] * 255.0 * 256.0 + float_array[2] * 255.0 ) & 0xFFFFFF );
        return ( ( ( (float_array[0] * 255.0) & 0xFF ) << 16 ) | 
                 ( ( (float_array[1] * 255.0) & 0xFF ) <<  8 ) |
                   ( (float_array[2] * 255.0) & 0xFF ) ) ;
    }
    
    // adapted from https://stackoverflole_vec2.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
    static distPointToLineSegment( p_vec2, ls_vec2, le_vec2 ) {
        var l2 = Vec2.distSquared(ls_vec2, le_vec2);
        if ( this.isApproxEqual( l2, 0.0 ) ) { return { dist: Vec2.dist(p_vec2, ls_vec2), t: 0.0 }; }
        let raw_t = ((p_vec2.x - ls_vec2.x) * (le_vec2.x - ls_vec2.x) + (p_vec2.y - ls_vec2.y) * (le_vec2.y - ls_vec2.y)) / l2;
        let t = Math.max(0, Math.min(1, raw_t));
        // console.log( `t = ${t}` );
        return { dist: Vec2.dist( p_vec2, new Vec2( ls_vec2.x + t * (le_vec2.x - ls_vec2.x),
                                                    ls_vec2.y + t * (le_vec2.y - ls_vec2.y) ) ), 
                //t: raw_t };
                t: t };
    }
    
    static mix( val_a, val_b, mix_factor ) {
        return val_a * ( 1.0 - mix_factor ) + val_b * mix_factor;
    }    
    
    static clamp( val, min_val, max_val ) {
        return Math.min( Math.max( val, min_val ), max_val );
    }
}