// Abstract
class RigidBody {
    constructor( center_of_mass) {
        if (this.constructor == RigidBody) {
            throw new Error( `Abstract class '${this.constructor.name}' can't be instantiated.`);
        }
        // this.shape_type = ShapeType.abstract;
        this.center_of_mass = center_of_mass;
        this.center_of_mass_WS = center_of_mass;
        this.angle_rad = 0.0;
        this.model_matrix = Mat2x3.createIdentity();
    }
    
    setPosition( pos_array2 ) { this.center_of_mass = pos_array2; }
    setRotation( angle_rad ) { this.angle_rad = angle_rad; }
    setModelMatrix( model_matrix ) { this.model_matrix = model_matrix; }
    getCenterOfMass() { return this.center_of_mass; }
    
    getBoundRadius() {}
    getBoundingCircle() { /*return [ this.center_of_mass, 0.0 ];*/ }
    getBoundingCircleWS() { /*return [ this.center_of_mass_WS.toArray(), 0.0 ];*/ }
    
    transformToWorldSpace() {}
    
    getInertia() {}
    
    toString() { return `'${this.constructor.name}'`; }
}

class RigidBody_Circle extends RigidBody {
    
    constructor( radius ) {
        let center_of_mass = new Array( 0.0, 0.0 );
        super( center_of_mass );
        this.shape_type = ShapeType.circle;
        
        console.log( `'${this.constructor.name}' ctor` );
        
        this.constructorHelper( center_of_mass, radius );
    }
    constructorHelper( center_of_mass, radius ) {
        this.radius = radius;
    }
    
    getBoundRadius() { return this.radius; }
    getBoundingCircle() { return [ this.center_of_mass, this.radius ]; }
    getBoundingCircleWS() { return [ this.center_of_mass_WS.toArray(), this.radius ]; }
    
    transformToWorldSpace() {
        // for now, nothing to do, until we add friction which will cause circles to spin 
        // currently we wouldn't even see the spinning on a solid-colored circle without position marker(s)
        this.center_of_mass_WS = Mat2x3.mulPosition( this.model_matrix, Vec2.fromArray( this.center_of_mass ) );
    }
    
    getInertia() {
        // // https://kamroncelcarter.blogspot.com/2022/08/moment-of-inertia-of-circle.html
        // const diameter = this.radius * 2.0;
        
        // const diameter_pow2 = diameter * diameter;
        // const diameter_pow4 = diameter_pow2 * diameter_pow2;
        // const I_xx = Math.PI * diameter_pow4 * ( 1.0 / 64.0 );
        // const I_yy = I_xx;
        // const I_zz = I_xx + I_yy;

        //const I_zz = 200.0;

        //this.mInertia = (1 / this.mInvMass) * (this.mRadius * this.mRadius) / 12;
        const I_zz = (this.radius * this.radius) / 12.0;
        console.log( `circle inertia for radius ${this.radius} is ${I_zz}` );
        return I_zz;
    }
}

class RigidBody_Polygon extends RigidBody {
    constructor( relative_path_points_ccw ) {
        let center_of_mass = new Array( 0.0, 0.0 );
        super( center_of_mass );
        this.shape_type = ShapeType.polygon;
        
        console.log( `'${this.constructor.name}' ctor` );
        
        this.relative_path_points_ccw = relative_path_points_ccw;
        this.world_space_points_ccw_vec2 = new Array();
        this.world_space_edge_normals_ccw_vec2 = new Array();
        this.constructorHelper();
    }
    constructorHelper() {
        this.bound_radius = -1;
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
            //console.log( ` this.relative_path_points_ccw = ${ this.relative_path_points_ccw}` );
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
            //console.log( `com_v = ${com_v}` );

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
    getBoundingCircleWS() { 
        const bounding_circle = this.getBoundingCircle();
        //console.log( `bounding circle center OS = ${Vec2.fromArray( bounding_circle[0] )} ` )
        this.bounding_circle_center_WS = Mat2x3.mulPosition( this.model_matrix, Vec2.fromArray( bounding_circle[0] ) );
        // console.log( `bounding circle center WS = ${this.bounding_circle_center_WS}` );
        // console.log( `this.center_of_mass_WS    = ${this.center_of_mass_WS}` );
        //console.log( `this.center_of_mass_WS - this.bounding_circle_center_WS = ${Vec2.sub( this.center_of_mass_WS, this.bounding_circle_center_WS )}` );
        //console.log( `len this.center_of_mass_WS - this.bounding_circle_center_WS = ${Vec2.sub( this.center_of_mass_WS, this.bounding_circle_center_WS ).len()}` );
        
        //return [ [ this.bounding_circle_center_WS.x, this.bounding_circle_center_WS.y ], bounding_circle[1] ]; 
        
        return [ this.bounding_circle_center_WS.toArray(), bounding_circle[1] ]; 
        //return [ this.center_of_mass_WS, this.radius ];
        //return [ this.center_of_mass_WS, bounding_circle[1] ];
    }
    
    getBoundRadius() {
        //if ( this.bound_radius < 0.0 ) {      
            this.getBoundingCircle();
            // console.log( `this.bound_radius = ${this.bound_radius}` );
        //}
        return this.bound_radius;
    }
 
    transformToWorldSpace() {
        this.world_space_points_ccw_vec2 = new Array();
        for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
            const rel_pt_array = this.relative_path_points_ccw[i];
            //console.log( rel_pt_array );
            const rel_pt_vec2 = new Vec2( rel_pt_array[0], rel_pt_array[1] );
            const world_pos = Mat2x3.mulPosition( this.model_matrix, rel_pt_vec2 );
            this.world_space_points_ccw_vec2.push( world_pos );
        }
        
        // calculate the edge normals
        this.world_space_edge_normals_ccw_vec2 = new Array();
        for ( let i = 0; i < this.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % this.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = this.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = this.world_space_points_ccw_vec2[j];

            const edge_dir = Vec2.sub( line_segment_end_vec2, line_segment_start_vec2 );
            const edge_normal = new Vec2( edge_dir.y, -edge_dir.x );
            edge_normal.normalize();
            this.world_space_edge_normals_ccw_vec2.push( edge_normal );
        }        
        
        this.center_of_mass_WS = Mat2x3.mulPosition( this.model_matrix, Vec2.fromArray( this.center_of_mass ) );
    }
    
    getInertia() {
        //return 20.0; // TODO!!!
        //return 5817477.0;
        return 100.0;
    }
}