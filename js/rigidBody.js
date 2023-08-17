"use strict";

// Abstract
class RigidBody {
    constructor( mass, restitution, friction ) {
        if (this.constructor == RigidBody) {
            throw new Error( `Abstract class '${this.constructor.name}' can't be instantiated.`);
        }

        this.center_of_mass_vec2 = new Vec2( 0.0, 0.0 ); // center of mass Object Space
        this.center_of_mass_vec2_WS = new Vec2( 0.0, 0.0 ); // center of mass World Space
        //this.angle_rad = 0.0;
        this.model_matrix = Mat2x3.createIdentity();
        
        this.pos_vec2 = new Vec2( 0.0, 0.0 );
        this.vel_vec2 = new Vec2( 0.0, 0.0 );
        this.accel_vec2 = SimulationParameters.globalGravity();
        this.angle_rad = 0.0;
        this.angular_vel = 0.0;
        this.angular_accel = 0.0;
        
        
        // safe assign
        if ( mass != undefined ) {
            this.recip_mass = mass; 
        } else {
            this.recip_mass = 1.0;
        }
        //if ( MathUtil.isApproxEqual( mass, 0.0 ) ) {
        if ( mass == 0.0 ) {
            this.accel_vec2 = new Vec2( 0.0, 0.0 ); // convention: static object has mass 0, thus no acceleration!
        } else {
            this.recip_mass = 1.0 / this.recip_mass;
        }

        this.inertia = 0.0;

        console.error( `this.recip_mass = ${this.recip_mass}` );
        
        if ( friction != undefined ) {
            this.friction = friction;
        } else {
            this.friction = 0.8;
        }

        if ( restitution != undefined ) {
            this.restitution = restitution;
        } else {
            this.restitution = 0.2;
        }        
    }
    
    update( dt ) {

        this.vel_vec2 = Vec2.add( this.vel_vec2, Vec2.mulScalar( this.accel_vec2, dt ) );
        this.vel_vec2.scale( 1.0 - SimulationParameters.globalLinearFriction() ); // friction
        this.pos_vec2 = Vec2.add( this.pos_vec2, Vec2.mulScalar( this.vel_vec2, dt ) );
        
        this.angular_vel += this.angular_accel * dt;
        this.angular_vel *= ( 1.0 - SimulationParameters.globalAngularFriction() );
        
        // limit values        
        if ( this.recip_mass > 0.0 ) {
            if ( this.angular_vel > 0.0 ) {
                this.angular_vel = Math.min( this.angular_vel, 1.5 );
                // if ( this.angular_vel < 0.05 ) {
                //     this.angular_vel = 0.0;
                // }
            } else if ( this.angular_vel < 0.0 ) {
                this.angular_vel = Math.max( this.angular_vel, -1.5 );
                // if ( this.angular_vel > -0.05 ) {
                //     this.angular_vel = 0.0;
                // }                    
            }
            
            if ( this.angular_accel > 0.0 ) {
                this.angular_accel = Math.min( this.angular_accel, 1.5 );
                // if ( this.angular_accel < 0.05 ) {
                //     this.angular_accel = 0.0;
                // }
            } else if ( this.angular_accel < 0.0 ) {
                this.angular_accel = Math.max( this.angular_accel, -1.5 );
                // if ( this.angular_accel > -0.05 ) {
                //     this.angular_accel = 0.0;
                // }
            }
        }
        this.angle_rad += this.angular_vel * dt;
    
    }

    postUpdate() {
        // for polygons we need to create matrix 
        const rot_mat               = Mat2x3.createRotation( this.angle_rad );
        const translation_mat       = Mat2x3.createTranslation(  this.pos_vec2.x,  this.pos_vec2.y );
        
        // console.log( `rot_mat = ${rot_mat}` );
        // console.log( `translation_mat = ${translation_mat}` );
        
        const model_matrix = Mat2x3.mulMat( translation_mat, rot_mat );
        this.setModelMatrix( model_matrix );
    }
    
    setRotation( angle_rad ) { this.angle_rad = angle_rad; }
    setModelMatrix( model_matrix ) { this.model_matrix = model_matrix; }
    getCenterOfMass() { return this.center_of_mass_vec2.toArray(); }

    setPos( pos_vec2 ) {
        this.pos_vec2 = pos_vec2;
    }
    translateBy( translation_delta_vec2 ) {
        this.pos_vec2.add( translation_delta_vec2 );
    }
    applyLinearVelocity( delta_linear_vel_vec2 ) {
        this.vel_vec2.add( delta_linear_vel_vec2 );        
    }
    
    setAngle( angle_rad ) {
        this.angle_rad = angle_rad;
    }
    rotateBy( delta_angle_rad ) {
        this.angle_rad += delta_angle_rad;        
    }
    applyAngularVelocity( delta_angle_vel_rad ) {
        this.angular_vel += delta_angle_vel_rad;
    }
    
    getBoundRadius() {}
    getBoundingCircle() {}
    getBoundingCircleWS() {}
    
    transformToWorldSpace() {}
    getInertia() {}
    
    toString() { return `'${this.constructor.name}'`; }
}

class RigidBody_Circle extends RigidBody {
    
    constructor( radius, mass, restitution, friction ) {

        super(mass, restitution, friction);
        this.shape_type = ShapeType.circle;
        
        console.log( `'${this.constructor.name}' ctor` );

        this.radius = radius;

        if ( this.recip_mass > 0.0 ) {
            this.inertia = this.getInertia();
        }        
    }
    
    getBoundRadius() { return this.radius; }
    getBoundingCircle() { return [ this.center_of_mass_vec2.toArray(), this.radius ]; }
    getBoundingCircleWS() { return [ this.center_of_mass_vec2_WS.toArray(), this.radius ]; }
    
    postUpdate() {
        super.postUpdate();        
        this.transformToWorldSpace();
    }
    
    transformToWorldSpace() {
        // for now, nothing to do, until we add friction which will cause circles to spin 
        // currently we wouldn't even see the spinning on a solid-colored circle without position marker(s)
        this.center_of_mass_vec2_WS = Mat2x3.mulPosition( this.model_matrix, this.center_of_mass_vec2 );
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
        const I_zz = (1.0 / this.recip_mass) * (this.radius * this.radius) / 12.0;
        console.log( `circle inertia for radius ${this.radius} is ${I_zz}` );
        return I_zz;
    }
}

class RigidBody_Polygon extends RigidBody {
    constructor( relative_path_points_ccw, mass, restitution, friction ) {

        super(mass, restitution, friction);
        this.shape_type = ShapeType.polygon;
        
        console.log( `'${this.constructor.name}' ctor` );
                
        this.relative_path_points_ccw = relative_path_points_ccw;
        this.world_space_points_ccw_vec2 = [];
        this.world_space_edge_normals_ccw_vec2 = [];

        this.bound_radius = -1;
        this.bounding_circle = [];
        this.getBoundRadius();
        this.getBoundingCircle();    
        
        if ( this.recip_mass > 0.0 ) {
            this.inertia = this.getInertia();
        }        
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
        
        return [ this.bounding_circle_center_WS.toArray(), bounding_circle[1] ]; 
    }
    
    getBoundRadius() {
        this.getBoundingCircle();
        return this.bound_radius;
    }
 
    postUpdate() {
        super.postUpdate();        
        this.transformToWorldSpace();
    }
    
    transformToWorldSpace() {
        this.world_space_points_ccw_vec2 = [];
        for ( let i = 0; i < this.relative_path_points_ccw.length; i++ ) {
            const rel_pt_array = this.relative_path_points_ccw[i];
            //console.log( rel_pt_array );
            const rel_pt_vec2 = new Vec2( rel_pt_array[0], rel_pt_array[1] );
            const world_pos = Mat2x3.mulPosition( this.model_matrix, rel_pt_vec2 );
            this.world_space_points_ccw_vec2.push( world_pos );
        }
        
        // calculate the edge normals
        this.world_space_edge_normals_ccw_vec2 = [];
        for ( let i = 0; i < this.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % this.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = this.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = this.world_space_points_ccw_vec2[j];

            const edge_dir = Vec2.sub( line_segment_end_vec2, line_segment_start_vec2 );
            const edge_normal = new Vec2( edge_dir.y, -edge_dir.x );
            edge_normal.normalize();
            this.world_space_edge_normals_ccw_vec2.push( edge_normal );
        }        
        
        this.center_of_mass_vec2_WS = Mat2x3.mulPosition( this.model_matrix, this.center_of_mass_vec2 );
    }
    
    getInertia() {
        //return 20.0; // TODO!!!
        //return 5817477.0;
        return 380.0;
    }
}