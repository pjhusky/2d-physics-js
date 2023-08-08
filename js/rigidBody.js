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
    
    toString() { return `'${this.constructor.name}'`; }
}

class RigidBody_Circle extends RigidBody {
    constructor( center_of_mass, radius ) {
        super( center_of_mass );
        this.shape_type = ShapeType.circle;
        this.radius = radius;
        
        console.log( `'${this.constructor.name}' ctor` );
    }
    
    getBoundRadius() { return this.radius; }
}

class RigidBody_Polygon extends RigidBody {
    constructor( center_of_mass, path_points_ccw ) {
        super( center_of_mass );
        this.shape_type = ShapeType.polygon;
        this.bound_radius = -1;
        console.log( `'${this.constructor.name}' ctor` );
    }
    
    getBoundRadius() {
        if ( this.bound_radius < 0 ) {
            // TODO: calculate!!!
            console.error( `TODO: calculate bound radius ${this}` );
        }
        return this.bound_radius;
    }
    
}