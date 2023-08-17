"use strict";

class GameObject {
    constructor( rigid_body, render_primitive ) {
        this.rigid_body = rigid_body;
        this.render_primitive = render_primitive;        
    }
    
    update( dt ) {
        
        this.rigid_body.update( dt );
                
        // update pose - both for rigid body, as well as for render_primitive
        this.render_primitive.setPosition( this.rigid_body.pos_vec2.x, this.rigid_body.pos_vec2.y );
        this.render_primitive.setRotation( this.rigid_body.angle_rad );
        
        this.rigid_body.postUpdate();
    }
    
    setPos( pos_vec2 ) {
        this.rigid_body.setPos( pos_vec2 );
    }
    translateBy( translation_delta_vec2 ) {
        this.rigid_body.translateBy( translation_delta_vec2 );
    }
    applyLinearVelocity( delta_linear_vel_vec2 ) {
        this.rigid_body.applyLinearVelocity( delta_linear_vel_vec2 );        
    }
    
    setAngle( angle_rad ) {
        this.rigid_body.setAngle( angle_rad );
    }
    rotateBy( delta_angle_rad ) {
        this.rigid_body.rotateBy( delta_angle_rad );
    }
    applyAngularVelocity( delta_angle_vel_rad ) {
        this.rigid_body.applyAngularVelocity( delta_angle_vel_rad );
    }

}

class GameObject_Breakable extends GameObject {
    constructor( rigid_body, render_primitive, mass, restitution, friction ) {
        super( rigid_body, render_primitive, mass, restitution, friction );
        this.shattered = false;       
    }
}