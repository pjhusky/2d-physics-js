class MathUtil {

    static isApproxEqual( x, y ) {
        // const zero_tolerance = 0.0000001;
        const zero_tolerance = 0.00001;
        return ( Math.abs( x - y ) < zero_tolerance );
    }
    
}