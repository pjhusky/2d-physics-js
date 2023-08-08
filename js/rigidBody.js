// https://2ality.com/2020/01/enum-pattern.html
class ShapeType {
    // static abstract = new ShapeType( 'Abstract' );
    static circle = new ShapeType( 'Circle' );
    static polygon = new ShapeType( 'Polygon' );
    
    constructor(name) {
        this.name = name;
    }
    
    toString() {
        return `ShapeType.${this.name}`;
    }
}

// Abstract
class RigidBody {
    constructor( center_of_mass) {
        if (this.constructor == RigidBody) {
            throw new Error( `Abstract class '${this.constructor.name}' can't be instantiated.`);
        }
        // this.shape_type = ShapeType.abstract;
        this.center_of_mass = center_of_mass;
        this.angle = 0.0;
    }
    
    getCenterOfMass() { return this.center_of_mass; }
    getBoundingCircle() { return [ this.center_of_mass, 0.0 ]; }
    
    toString() { return `'${this.constructor.name}'`; }
}

class RigidBody_Circle extends RigidBody {
    constructor( center_of_mass, radius ) {
        super( center_of_mass );
        console.log( `'${this.constructor.name}' ctor` );
        
        this.shape_type = ShapeType.circle;
        this.radius = radius;
    }
    
    getBoundRadius() { return this.radius; }
    getBoundingCircle() { return [ this.center_of_mass, this.radius ]; }
}

class RigidBody_Polygon extends RigidBody {
    constructor( center_of_mass, relative_path_points_ccw ) {
        super( center_of_mass );
        console.log( `'${this.constructor.name}' ctor` );
        
        this.shape_type = ShapeType.polygon;
        this.bound_radius = -1;
        this.relative_path_points_ccw = relative_path_points_ccw;
        this.bounding_circle = new Array();
        this.getBoundRadius();
        this.getBoundingCircle();
    }
    
    getBoundingCircle() {
        if ( this.bound_radius < 0.0 ) {
            //console.error( `TODO: calculate bound radius ${this}` );
            
            // const com = this.getCenterOfMass();
            // const com = this.getCenterOfMass();
            // const com_v = new Vec2( com[0], com[1] );
            // console.log( `this.path_points_ccw = ${this.path_points_ccw}` );

            let sum_x = 0.0;
            let sum_y = 0.0;
            for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
                const curr_x = this.relative_path_points_ccw[i][0]; // + com[0];
                const curr_y = this.relative_path_points_ccw[i][1]; // + com[1];
                sum_x += curr_x;
                sum_y += curr_y;
            }
            const recip_num_pts = 1.0 / this.relative_path_points_ccw.length;
            sum_x *= recip_num_pts;
            sum_y *= recip_num_pts;
            const com_v = new Vec2( sum_x, sum_y );
            console.log( `com_v = ${com_v}` );

            // recenter pivot (center of mass) to object-space origin
            for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
                this.relative_path_points_ccw[i][0] -= com_v.x;
                this.relative_path_points_ccw[i][1] -= com_v.y;
            }           

            // TEST
            // {
            //     sum_x = 0.0;
            //     sum_y = 0.0;
            //     for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
            //         const curr_x = this.relative_path_points_ccw[i][0]; // + com[0];
            //         const curr_y = this.relative_path_points_ccw[i][1]; // + com[1];
            //         sum_x += curr_x;
            //         sum_y += curr_y;
            //     }
            //     sum_x *= recip_num_pts;
            //     sum_y *= recip_num_pts;
            //     console.log( ` *** com_v test, should be (0|0) = ${new Vec2(sum_x, sum_y)}` );        
            // }
            
            // Center of Mass is good, BUT for the bounding radius, we actually need the smallest circle enclosing all vertices
            
            const bounding_circle = BoundingCircle.makeCircle( this.relative_path_points_ccw );
            
            // for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
            //     this.relative_path_points_ccw[i][0] -= bounding_circle[0];
            //     this.relative_path_points_ccw[i][1] -= bounding_circle[1];
            // }           
            this.bound_radius = bounding_circle[2];
            this.bounding_circle = [ [ bounding_circle[0], bounding_circle[1] ], bounding_circle[2] ];
        }
        
        return this.bounding_circle;
    }
    
    getBoundRadius() {
        if ( this.bound_radius < 0.0 ) {
                
            this.getBoundingCircle();
            console.log( `this.bound_radius = ${this.bound_radius}` );
        }
        return this.bound_radius;
    }
    
}