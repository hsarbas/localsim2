class AbstractRoad extends Signal{
    constructor(label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes = []){
        super();
        this.events = ['destroy', 'change', 'move'];
        this.label = label;
        this._lanes = lanes;
        this._lane_width = lane_width;
        this.width = lanes * lane_width;
        this.speed_limit = speed_limit;
        this._priority = priority;
        this.type_ = type_;
        this.z_axis = z_axis;
        this.segments = new SegmentCollection(src, dst, split_nodes);
        this.src = this.segments.src;
        this.dst = this.segments.dst;
    }

    get_priority(){
        return this._priority;
    }

    set_priority(new_priority){
        if(new_priority != this.get_priority()){
            this._priority = new_priority;
            this.fire('change', new Map().set('value', 'priority'))
        }
    }

    get_lanes(){
        return this._lanes;
    }
    set_lanes(new_lane){
        if(new_lane > 0){
            if(new_lane != this.get_lanes()){
                this._lanes = new_lane;
                this.width = this.get_lanes() * this.get_lane_width();
                this.fire('change', new Map().set('value', 'lanes'));
            }
        }
        else{
            throw 'ValueError';
        }
    }

    get_lane_width(){
        return this._lane_width;
    }

    set_length(d2){
        let segment = this.segments.segments[this.segments.segments.length-1];
        let x1 = segment.src.x;
        let y1 = segment.src.y;
        let x2 = segment.dst.x;
        let y2 = segment.dst.y;
        let d1 = segment.get_length();
        if(this.segments.segments.length > 1){
            for(let i=0; i<this.segments.segments.length-1; i++){
                let s = this.segments.segments[i];
                d2 -= s.get_length();
            }
        }

        let new_x = x1 + ((x2 - x1) * (d2 / d1));
        let new_y = y1 + ((y2 - y1) * (d2 / d1));
        segment.set_length(d2);
        segment.dst.move(new_x, new_y);
    }

    set_lane_width(new_lane_width){
        if(new_lane_width > 0){
            if(new_lane_width != this._lane_width){
                this._lane_width = new_lane_width;
                this.width = this._lanes * this._lane_width;
                this.fire('change', new Map().set('value', 'lane_width'));
            }
        }
        else{
            throw 'ValueError';
        }
    }

    destroy(){
        this.fire('destroy');
    }
}


class Uninterrupted_Road extends AbstractRoad{
    constructor(label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes){
        super(label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes);

        this.src.connect(this, 'move', this._signal_callback);
        this.dst.connect(this, 'move', this._signal_callback);

        this.length = this.segments.get_length();
        let s_nodes = this.segments.get_split_nodes();

        for(let s_node of s_nodes){
            s_node.connect(this, 'move', this._signal_callback);
        }
    }

    _signal_callback(event, source, kwargs) {
        if(event == 'move'){
            this.length = this.segments.get_length();
            this.fire('move');
        }
    }

    split(segment, x, y){
        let split_node = this.segments.split(segment, x, y);
        split_node.connect(this, 'move', this._signal_callback);
        this.length = this.segments.get_length();
        this.fire('change', new Map().set('action', 'split'));
        return split_node;
    }

    merge(split_node){
        this.segments.merge(split_node);
        split_node.disconnect(this, 'move', this._signal_callback);
        split_node.destroy();
        this.length = this.segments.get_length();
        this.fire('change', new Map().set('action', 'merge'));
    }

    deconstruct(){
        const cls = "localsim.models.infra.road.road.UninterruptedRoad";
        let targs = [this.label, this.src, this.dst, parseInt(this.get_lanes()), this.get_lane_width(), parseFloat(this.speed_limit),
            this.get_priority(), this.type_, this.z_axis];
        const args = targs.concat(this.segments.get_split_nodes());
        const kwargs = {};
        return [cls, args, kwargs]
    }
}


class Interrupted_Road extends AbstractRoad{
    constructor(label, src_road, dst_road, src_list, dst_list, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes){
        super(label, src_road.dst, dst_road.src, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes);

        //this.w_src_road = new WeakSet().add(src_road);
        //this.w_dst_road = new WeakSet().add(dst_road);
        this.src_road = src_road;
        this.dst_road = dst_road;

        this.src_list = src_list;
        this.dst_list = dst_list;

        this.src_road.connect(this, 'move', this._signal_callback);
        this.dst_road.connect(this, 'move', this._signal_callback);
        this.src_road.connect(this, 'change', this._signal_callback);
        this.dst_road.connect(this, 'change', this._signal_callback);

        this.length = this.segments.get_length();
        let s_nodes = this.segments.get_split_nodes();
        for(let s_node of s_nodes){
            s_node.connect(this, 'move', this._signal_callback);
        }

        src_list.sort();
        dst_list.sort();

        this.in_matrix = new Map();
        this.out_matrix = new Map();

        for(let ctr=0; ctr<src_list.length; ctr++){
            this.in_matrix.set(src_list[ctr], ctr);
            this.out_matrix.set(ctr, dst_list[ctr]);
        }
    }

    _signal_callback(event, source, kwargs){ // source and kwargs
        if(event == 'move'){
            this.length = this.segments.get_length();
            this.fire('move');
        }

        else if(event == 'destroy'){
            this.fire('destroy');
        }

        else if(event == 'change'){ //  and kwargs.get('value') == 'lanes'
            // TODO: Do something
            this.fire('change');
        }
    }

    split(segment, x, y){
        let split_node = this.segments.split(segment, x, y);
        split_node.connect(this, 'move', this._signal_callback);
        this.length = this.segments.get_length();
        this.fire('change', new Map().set('action', 'split')); // action=split
        return split_node;
    }

    merge(split_node){
        this.segments.merge(split_node);
        split_node.disconnect(this, 'move', this._signal_callback);
        split_node.destroy();
        this.length = this.segments.get_length();
        this.fire('change', new Map().set('action', 'merge')); // action=merge
    }

    deconstruct(){
        const cls = "localsim.models.infra.road.road.InterruptedRoad";
        let from = [];
        let to = [];
        for(let [key, value] of this.in_matrix){
            from.push(key);
        }

        for(let [key_, value_] of this.out_matrix){
            to.push(value_);
        }

        let targs = [this.label, this.src_road, this.dst_road, from, to, parseInt(this.get_lanes()),
            this.get_lane_width(), parseFloat(this.speed_limit), this.get_priority(), this.type_, this.z_axis];
        const args = targs.concat(this.segments.get_split_nodes());
        const kwargs = {};
        return [cls, args, kwargs]
    }

    edit_lane_match(src_list, dst_list){
        src_list.sort();
        dst_list.sort();
        this.in_matrix = new Map();
        this.out_matrix = new Map();

        for(let ctr=0; ctr<src_list.length; ctr++){
            this.in_matrix.set(src_list[ctr], ctr);
            this.out_matrix.set(ctr, dst_list[ctr]);
        }
        this.fire('change');
    }
}


class Segment{
    constructor(src, dst){
        this.src = src;
        this.dst = dst;

        this.dx = this.dst.x - this.src.x;
        this.dy = this.dst.y - this.src.y;
        this._length = Math.sqrt((this.dx*this.dx) + (this.dy*this.dy));

        this.src.connect(this, 'move', this._signal_callback);
        this.dst.connect(this, 'move', this._signal_callback);
    }

    _signal_callback(event, source, kwargs){
        if(event == 'move'){
            this.dx = this.dst.x - this.src.x;
            this.dy = this.dst.y - this.src.y;
            this.set_length(Math.sqrt((this.dx*this.dx) + (this.dy*this.dy)));
        }
    }

    split(x, y){
        let split_node = new Node(x, y, 'seg');
        return [new Segment(this.src, split_node), new Segment(split_node, this.dst)];
    }

    merge(segment){
        return new Segment(this.src, segment.dst);
    }

    get_length(){
        return this._length;
    }

    set_length(length){
        this._length = length;
    }
}


class SegmentCollection{
    constructor(src, dst, split_nodes){
        this.src = src;
        this.dst = dst;
        this.segments = [new Segment(this.src, this.dst)];

        for(let ctr=0; ctr<split_nodes.length; ctr++){
            this.split(this.segments[ctr], split_nodes[ctr].x, split_nodes[ctr].y);
        }
    }

    split(segment, x, y){
        let split = segment.split(x, y);
        let split1 = split[0],
            split2 = split[1];

        let index = this.segments.indexOf(segment);

        this.segments[index] = split2;
        this.segments.splice(index, 0, split1);

        return split1.dst;
    }

    get_split_nodes(){
        var ret = [];
        for(let ctr=0; ctr<this.segments.length-1; ctr++){
            ret.push(this.segments[ctr].dst);
        }
        return ret;
    }

    get_split_xy(){
        let ret = [];
        for(let ctr=0; ctr<this.segments.length-1; ctr++){
            ret.push(new Map());

            ret[ctr].set('x', this.segments[ctr].dst.x);
            ret[ctr].set('y', this.segments[ctr].dst.y);
        }
        return ret;
    }

    merge(split_node){
        let split1, split2, split_index;
        let success = false;

        for(let ctr=0; ctr<this.segments.length; ctr++){
            if(this.segments[ctr].dst == split_node){
                split1 = this.segments[ctr];
                split2 = this.segments[ctr + 1];
                split_index = ctr;
                success = true;
                break;
            }
        }

        if(success == false){
            throw 'Merge Error';
        }

        this.segments[split_index] = split1.merge(split2);
        this.segments.splice(this.segments.indexOf(split2), 1);
    }

    get_length(){
        let sum = 0;
        for(let seg of this.segments){
            sum += seg.get_length();
        }

        return sum.toFixed(2);
    }
}