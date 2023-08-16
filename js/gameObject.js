class GameObject {
    constructor( rigid_body, render_primitive, mass, restitution, friction ) {
        this.rigid_body = rigid_body;
        this.render_primitive = render_primitive;
        
        this.pos_vec2 = new Vec2( 0.0, 0.0 );
        
        this.vel_vec2 = new Vec2( 0.0, 0.0 );
        this.accel_vec2 = GameObject.gravity();
        this.angle_rad = 0.0;
        this.angular_vel = 0.0;
        this.angular_accel = 0.0;
        
        this.inertia = 0.0;
        
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
        if ( this.recip_mass > 0.0 ) {
        //if ( mass != undefined && mass > 0.0 ) {
            this.inertia = (1.0 / this.recip_mass) * this.rigid_body.getInertia();
        }
    
        if ( friction != undefined ) {
            this.friction = friction;
        } else {
            this.friction = 0.5;
        }

        if ( restitution != undefined ) {
            this.restitution = restitution;
        } else {
            this.restitution = 0.3;
        }
    }

    static gravity() { return new Vec2( 0.0, 9.81 * 5.0 ); } // TODO: move to some global parameter file/class
    static linear_friction() { return 0.9875; }
    static angular_friction() { return 0.998; }
    
    update( dt ) {
        
        // if ( isNaN( this.vel_vec2.x ) ) {
        //     console.error( `isNan 3!!!` );
        // }
        this.vel_vec2 = Vec2.add( this.vel_vec2, Vec2.mulScalar( this.accel_vec2, dt ) );
        this.vel_vec2.scale( GameObject.linear_friction() ); // friction
        // if ( isNaN( this.vel_vec2.x ) ) {
        //     console.error( `isNan 3!!!` );
        // }

        this.pos_vec2 = Vec2.add( this.pos_vec2, Vec2.mulScalar( this.vel_vec2, dt ) );

        // if ( isNaN( this.vel_vec2.x ) ) {
        //     console.error( `isNan 4!!!` );
        // }
        
        this.angular_vel += this.angular_accel * dt;
        this.angular_vel *= GameObject.angular_friction();
        this.angle_rad += this.angular_vel * dt;
        
        // update pose - both for rigid body, as well as for render_primitive
        this.render_primitive.setPosition( this.pos_vec2.x, this.pos_vec2.y );
        this.render_primitive.setRotation( this.angle_rad );
        
        // circles: for now it's enough to just copy the position - we don't visualize the rotation state anyway
        
        // for polygons we need to create matrix 
        //const inv_translation_mat   = Mat2x3.createTranslation( -this.pos_vec2.x, -this.pos_vec2.y );
        const rot_mat               = Mat2x3.createRotation( this.angle_rad );
        const translation_mat       = Mat2x3.createTranslation(  this.pos_vec2.x,  this.pos_vec2.y );
        
        // console.log( `rot_mat = ${rot_mat}` );
        // console.log( `translation_mat = ${translation_mat}` );
        
        const model_matrix = Mat2x3.mulMat( translation_mat, rot_mat );
        this.rigid_body.setModelMatrix( model_matrix );
        this.rigid_body.transformToWorldSpace();
    }
    
    setPos( pos_vec2 ) {
        this.pos_vec2 = pos_vec2;
    }
    translateBy( translation_delta_vec2 ) {
        this.pos_vec2.add( translation_delta_vec2 );
    }
    applyLinearVelocity( delta_linear_vel_vec2 ) {
        //this.pos_vec2.add( Vec2.mulScalar( delta_linear_vel_vec2, 0.5 ) );
        this.vel_vec2.add( delta_linear_vel_vec2 );        
        // if ( isNaN( this.vel_vec2.x ) ) {
        //     console.error( `isNan input!!!` );
        // }
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
}