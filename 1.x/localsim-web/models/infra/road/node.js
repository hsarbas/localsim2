//function Node(x, y, dir){
//    //Signal.call(this);
//    Observable.call(this);
//
//    //this.events = ['move', 'destroy'];
//
//    this.x = x;
//    this.y = y;
//    this.dir = dir;
//
//    this.move = function(x, y){
//        this.x = x;
//        this.y = y;
//        this.fire('move');
//    };
//
//    this.deconstruct = function(){
//
//    };
//}

class Node extends Signal{

    constructor(x, y, dir){
        super();
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.events = ['move', 'destroy'];
    }

    move(x, y){
        let change = false;

        if(x != null && x != this.x){
            this.x = x;
            change = true;
        }

        if(y != null && y != this.x) {
            this.y = y;
            change = true;
        }

        if(change){
            this.fire('move');
        }
    }

    destroy(){
        this.fire('destroy');
    }

    deconstruct() {
        const cls = "localsim.models.infra.road.node.Node";
        const args = [this.x, this.y, this.dir];
        const kwargs = {};
        return [cls, args, kwargs]
    }

}
