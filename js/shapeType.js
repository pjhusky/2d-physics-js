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

