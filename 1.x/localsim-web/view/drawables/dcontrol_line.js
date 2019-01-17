class DControlLine{

    constructor(gc, control){
        this.gc = gc;
        this.object = control;
        this.segment = this.object.road.segments.segments[0];
        this.item = null;
        this.name = control.constructor.name;

        this.object.connect_to_all(this, this.responder);
        this.draw();
    }

    responder(event, source, extras){
        if(event == 'move'){
            this.move();
        }
        else if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'update'){
            this.item.style('stroke', STOP_LIGHT_FILL[this.object.get_state()[0]]);
        }
        else{
            throw 'NotImplementedError';
        }
    }

    draw(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let fill = 'none';
        let stroke = '';
        if(this.name == 'Stop'){
            stroke = STOP_FILL;
        }
        else if(this.name == 'StopLight'){
            stroke = STOP_LIGHT_FILL[this.object.get_init_state()[0]];
        }
        else if(this.name == 'Yield'){
            stroke = YIELD_FILL;
        }
        else{
            stroke = '';
        }
        this.item = this.gc.create_line(this, points, null, null, CONTROL_WIDTH, fill, stroke);
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y')});

        this.item.attr("d", line(points));
    }

    _get_draw_points(){
        let relative_pos = this.object.pos;
        let seg = this.object.road.segments.segments[0];
        for(let ctr=0; ctr<this.object.road.segments.segments.length; ctr++){
            seg = this.object.road.segments.segments[ctr];
            if(relative_pos - seg.get_length() <= 0){
                break;
            }
            relative_pos -= seg.get_length();
        }

        if(seg){
            this.segment = seg;
        }

        let src_x = null;
        let src_y = null;
        let dst_x = null;
        let dst_y = null;

        if(this.object.road.constructor.name == 'Interrupted_Road'){
            let road_ = this.object.road;
            let key = road_.in_matrix.keys();
            let keys = [];

            for(let ctr=0; ctr<road_.in_matrix.size; ctr++){
                keys.push(key.next().value);
            }

            let ret = this.trans_node(road_.src_road.segments.segments[road_.src_road.segments.segments.length-1],
                (keys[keys.length-1] + keys[0])/2.0, road_.src_road.width, road_.src_road.get_lane_width());

            let mx = ret[0];
            let my = ret[1];

            let smx = mx + road_.src_road.dst.x;
            let smy = my + road_.src_road.dst.y;

            key = road_.out_matrix.values();
            keys = [];
            for(let ctr=0; ctr<road_.out_matrix.size; ctr++){
                keys.push(key.next().value);
            }
            ret = this.trans_node(road_.dst_road.segments.segments[road_.dst_road.segments.segments.length-1],
                (keys[keys.length-1] + keys[0])/2.0, road_.dst_road.width, road_.dst_road.get_lane_width());

            mx = ret[0];
            my = ret[1];

            let dmx = mx + road_.dst.x;
            let dmy = my + road_.dst.y;

            if(road_.segments.segments[0] == road_.segments.segments[road_.segments.segments.length-1]){
                src_x = smx;
                src_y = smy;
                dst_x = dmx;
                dst_y = dmy;
            }
            else if(this.segment == road_.segments.segments[0]){
                src_x = smx;
                src_y = smy;
                dst_x = this.segment.dst.x;
                dst_y = this.segment.dst.y;
            }
            else if(this.segment == road_.segments.segments[road_.segments.segments.length-1]){
                src_x = this.segment.src.x;
                src_y = this.segment.src.y;
                dst_x = dmx;
                dst_y = dmy;
            }
            else{
                src_x = this.segment.src.x;
                src_y = this.segment.src.y;
                dst_x = this.segment.dst.x;
                dst_y = this.segment.dst.y;
            }
        }

        else{
            src_x = this.segment.src.x;
            src_y = this.segment.src.y;
            dst_x = this.segment.dst.x;
            dst_y = this.segment.dst.y;
        }

        let ret = delta_pt_in_line(src_x, src_y, dst_x, dst_y, relative_pos);
        let lx = ret[0];
        let ly = ret[1];

        ret = delta_pt_in_perp_line(src_x, src_y, dst_x, dst_y, this.object.road.width / 2.0);
        let px = ret[0];
        let py = ret[1];

        ret = delta_pt_in_perp_line(src_x-px, src_y-py, dst_x-px, dst_y-py, this.object.lane * this.object.road.get_lane_width());
        let dx = ret[0];
        let dy = ret[1];

        let points = [];
        let temp = new Map();
        temp.set('x', Math.round((src_x + lx - px + dx) * this.gc.zoom_level));
        temp.set('y', Math.round((src_y + ly - py + dy) * this.gc.zoom_level));
        points.push(temp);

        ret = delta_pt_in_perp_line(src_x-px, src_y-py, dst_x-px, dst_y-py, (this.object.lane + 1) * this.object.road.get_lane_width());
        dx = ret[0];
        dy = ret[1];

        temp = new Map();
        temp.set('x', Math.round((src_x + lx - px + dx) * this.gc.zoom_level));
        temp.set('y', Math.round((src_y + ly - py + dy) * this.gc.zoom_level));
        points.push(temp);

        return points;
    }

    destroy(){
        if(this.item){
            this.gc.delete_(this.item);
        }
        this.object.disconnect_to_all(this, this.responder);
        this.object = null;
        this.item = null;
    }

    set_segment(new_segment){
        this.segment = new_segment;
    }

    trans_node(segment, lane, width, lane_width){
        return delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y, lane * lane_width + (lane_width - width)/2.0);
    }
}