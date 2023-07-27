//import * as mathLib from "./mathLib.js";

class Triangle {
    constructor( ccw_p0, ccw_p1, ccw_p2 ) {
        this.p0 = new /*mathLib.*/Vec2( ccw_p0.x, ccw_p0.y );
        this.p1 = new /*mathLib.*/Vec2( ccw_p1.x, ccw_p1.y );
        this.p2 = new /*mathLib.*/Vec2( ccw_p2.x, ccw_p2.y );
        
        // this.p0 = ccw_p0;
        // this.p1 = ccw_p1;
        // this.p2 = ccw_p2;
        // this.radius = -1.0;
        // this.circum_center = new Vec2( 0.0, 0.0 );
    }
    
    get points() {
        return [ this.p0, this.p1, this.p2 ];
    }
    
    toString() {
        return `{"Triangle": "[[${this.p0.x}, ${this.p0.y}], [${this.p1.x}, ${this.p1.y}], [${this.p2.x}, ${this.p2.y}]]"}`;
    }
    
    circumCenter() {
        // https://de.wikipedia.org/wiki/Umkreis
        const x1 = this.p0.x;
        const y1 = this.p0.y;
        const x2 = this.p1.x;
        const y2 = this.p1.y;
        const x3 = this.p2.x;
        const y3 = this.p2.y;
        
        const x1x1 = x1*x1;
        const y1y1 = y1*y1;
        const x2x2 = x2*x2;
        const y2y2 = y2*y2;
        const x3x3 = x3*x3;
        const y3y3 = y3*y3;
        
        const d = 2.0 * ( x1 * ( y2 - y3 ) + x2 * ( y3 - y1 ) + x3 * ( y1 - y2 ) );
        const recip_d = 1.0 / d;
        
        const cx = ( (x1x1+y1y1)*(y2-y3) + (x2x2+y2y2 )*(y3-y1) + (x3x3+y3y3)*(y1-y2) ) * recip_d;
        const cy = ( (x1x1+y1y1)*(x3-x2) + (x2x2+y2y2 )*(x1-x3) + (x3x3+y3y3)*(x2-x1) ) * recip_d;
        
        return new Vec2( cx, cy );
    }
    
    static circumCenter(tri) {
        return tri.circumCenter();
    }

    static circumCenterAndRadis(tri) {
        const circum_center = tri.circumCenter();
        const radius = Vec2.dist( tri.p0, circum_center );
        return [ circum_center, radius ];
    }
}
