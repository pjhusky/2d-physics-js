class GameObject {
    constructor( rigid_body, render_primitive ) {
        this.rigid_body = rigid_body;
        this.render_primitive = render_primitive;
        this.pos_vec2 = new Vec2( 0.0, 0.0 );
        this.angle_rad = 0.0;
    }
    
    update() {
        // update pose - both for rigid body, as well as for render_primitive
        this.render_primitive.setPosition( this.pos_vec2.x, this.pos_vec2.y );
        this.render_primitive.setRotation( this.angle_rad );
    }
    
    setPos( pos_vec2 ) {
        this.pos_vec2 = pos_vec2;
    }
    translateBy( translation_delta_vec2 ) {
        this.pos_vec2.add( translation_delta_vec2 );
    }
    
    setAngle( angle_rad ) {
        this.angle_rad = angle_rad;
    }
    rotateBy( delta_angle_rad ) {
        this.angle_rad += delta_angle_rad;
    }
}