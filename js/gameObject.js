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
    
    setAngle( angle_rad ) {
        this.angle_rad = angle_rad;
    }
    rotateBy( delta_angle_rad ) {
        this.angle_rad += delta_angle_rad;
    }
}