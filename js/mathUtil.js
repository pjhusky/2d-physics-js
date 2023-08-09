class MathUtil {

    static isApproxEqual( x, y ) {
        // const zero_tolerance = 0.0000001;
        const zero_tolerance = 0.00001;
        return ( Math.abs( x - y ) < zero_tolerance );
    }
    
    //static normalizedFloatToByte( 
    static rgbFloatsToHexColor( float_array ) {
        return ( ( ( ( float_array[0] * 255.0 + float_array[1] ) * 255.0 + float_array[2] ) * 255.0 ) & 0xFFFFFF );
    }
}