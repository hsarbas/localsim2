class DControlZone{

    constructor(gc, control, segments){
        this.gc = gc;
        this.object = control;
        this.item = null;
        this.segments = [];
        this.name = control.constructor.name;
        this.road_type = control.road.constructor.name;
        let get_segment = false;

        for(let segment of this.object.road.segments.segments){
            if(segment == segments.get('src')){
                get_segment = true;
            }
            if(get_segment){
                this.segments.push(segment);
            }
            if(segment == segments.get('dst')){
                break;
            }
        }

        if(this.segments.length == 0){
            get_segment = false;
            let reversed = [];
            for(let _seg of this.object.road.segments.segments){
                reversed.unshift(_seg);
            }

            for(let segment of reversed){
                if(segment == segments.get('src')){
                    get_segment = true;
                }
                if(get_segment){
                    this.segments.unshift(segment);
                }
                if(segment == segments.get('dst')){
                    break;
                }
            }
            //console.log('segments:', this.segments);
        }

        this.object.connect_to_all(this, this.responder);
        this.draw();
        this.move();
    }

    responder(event, source){
        if(event == 'move'){
            this.move();
        }
        else if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'tick_data' || event == 'stop_data'){

        }
        else{
            throw 'NotImplementedError';
        }
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }
        this._update_segments();
        let points = null;
        if(this.road_type == 'Uninterrupted_Road'){
            points = this._uroad_points();
        }
        else{
            points = this._iroad_points();
        }

        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y')});

        this.item.attr("d", line(points));
    }

    draw(){
        let fill = '';
        let stroke = '';
        let points = null;
        if(this.road_type == 'Uninterrupted_Road'){
            points = this._uroad_points();
        }
        else{
            points = this._iroad_points();
        }

        if(this.name == 'TypeRestrictionZone'){
            stroke = TYPE_RESTRICTION_FILL;
            fill = stroke;
        }
        else if(this.name == 'SpeedLimitZone'){
            stroke = SPEED_LIMIT_FILL;
            fill = stroke;
        }
        else if(this.name == 'BusTerminalZone'){
            stroke = PTSTOP_FILL;
            fill = stroke;
        }

        this.item = this.gc.create_line(this, points, null, null, 1, fill, stroke);
    }

    _update_segments(){
        let pos = this.object.pos;
        let zone = this.object.exit;
        this.segments = [];
        let get_segments = false;

        for(let segment of this.object.road.segments.segments){

            if(pos - segment.get_length() <= 0){
                get_segments = true;
            }
            if(get_segments){
                this.segments.push(segment);
            }
            if(zone - segment.get_length() <= 0){
                break;
            }
            pos -= segment.get_length();
            zone -= segment.get_length();
        }
    }

    _uroad_points(){
        let points = [];
        let relative_pos = this.object.pos;
        let relative_zone = this.object.exit;
        let first = true;
        let start_seg = this.segments[0];
        //console.log(start_seg);
        let end_seg = this.segments[this.segments.length-1];

        for(let seg of this.object.road.segments.segments){
            if(seg == end_seg){
                break;
            }
            if(seg == start_seg){
                first = false;
            }
            if(first){
                relative_pos -= seg.get_length();
            }
            relative_zone -= seg.get_length();
        }

        let ret = delta_pt_in_line(start_seg.src.x, start_seg.src.y, start_seg.dst.x, start_seg.dst.y, relative_pos);
        let long_px = ret[0];
        let long_py = ret[1];

        let d = (this.object.road.width / 2.0) - (this.object.lane * this.object.road.get_lane_width());

        ret = delta_pt_in_perp_line(start_seg.src.x, start_seg.src.y, start_seg.dst.x, start_seg.dst.y, d);
        let lat_px = ret[0];
        let lat_py = ret[1];

        ret = delta_pt_in_line(end_seg.src.x, end_seg.src.y, end_seg.dst.x, end_seg.dst.y, relative_zone);
        let long_ex = ret[0];
        let long_ey = ret[1];

        ret = delta_pt_in_perp_line(end_seg.src.x, end_seg.src.y, end_seg.dst.x, end_seg.dst.y, d);
        let lat_ex = ret[0];
        let lat_ey = ret[1];

        let temp = null;
        for(let segment of this.segments){
            if(segment == start_seg){
                temp = new Map();
                temp.set('x', start_seg.src.x - lat_px + long_px);
                temp.set('y', start_seg.src.y - lat_py + long_py);
                points.push(temp);

                if(this.segments.length == 2){
                    temp = new Map();
                    temp.set('x', start_seg.dst.x - lat_px);
                    temp.set('y', start_seg.dst.y - lat_py);
                    points.push(temp);
                }
            }

            if(segment != start_seg && segment != end_seg){
                let src = segment.src;
                let dst = segment.dst;

                ret = delta_pt_in_perp_line(src.x, src.y, dst.x, dst.y, this.object.road.width/2.0);
                let sx = ret[0];
                let sy = ret[1];

                let in_src = new Map();
                in_src.set('x', segment.src.x - sx);
                in_src.set('y', segment.src.y - sy);

                let in_dst = new Map();
                in_dst.set('x', segment.dst.x - sx);
                in_dst.set('y', segment.dst.y - sy);

                ret = delta_pt_in_perp_line(in_src.get('x'), in_src.get('y'), in_dst.get('x'), in_dst.get('y'),
                    this.object.lane * this.object.road.get_lane_width());
                let dx = ret[0];
                let dy = ret[1];

                temp = new Map();
                temp.set('x', in_src.get('x') + dx);
                temp.set('y', in_src.get('y') + dy);
                points.push(temp);

                temp = new Map();
                temp.set('x', in_dst.get('x') + dx);
                temp.set('y', in_dst.get('y') + dy);
                points.push(temp);
            }

            if(segment == end_seg){
                temp = new Map();
                temp.set('x', end_seg.src.x + long_ex - lat_ex);
                temp.set('y', end_seg.src.y + long_ey - lat_ey);
                points.push(temp);
            }
        }

        let reversed = [];
        for(let _seg of this.segments){
            reversed.unshift(_seg);
        }

        for(let segment of reversed){
            d = (this.object.road.width / 2.0) - ((this.object.lane + 1) * this.object.road.get_lane_width());

            if(segment == end_seg){
                ret = delta_pt_in_perp_line(end_seg.src.x, end_seg.src.y, end_seg.dst.x, end_seg.dst.y, d);
                lat_ex = ret[0];
                lat_ey = ret[1];

                temp = new Map();
                temp.set('x', end_seg.src.x + long_ex - lat_ex);
                temp.set('y', end_seg.src.y + long_ey - lat_ey);
                points.push(temp);
            }

            if(segment != start_seg && segment != end_seg){
                let src = segment.src;
                let dst = segment.dst;

                ret = delta_pt_in_perp_line(src.x, src.y, dst.x, dst.y, this.object.road.width / 2.0);
                let px = ret[0];
                let py = ret[1];

                let in_src = new Map();
                in_src.set('x', segment.src.x - px);
                in_src.set('y', segment.src.y - py);

                let in_dst = new Map();
                in_dst.set('x', segment.dst.x - px);
                in_dst.set('y', segment.dst.y - py);

                ret = delta_pt_in_perp_line(in_src.get('x'), in_src.get('y'), in_dst.get('x'), in_dst.get('y'),
                    (this.object.lane + 1) * this.object.road.get_lane_width());
                let dx = ret[0];
                let dy = ret[1];

                temp = new Map();
                temp.set('x', in_dst.get('x') + dx);
                temp.set('y', in_dst.get('y') + dy);
                points.push(temp);

                temp = new Map();
                temp.set('x', in_src.get('x') + dx);
                temp.set('y', in_src.get('y') + dy);
                points.push(temp);

            }

            if(segment == start_seg){
                ret = delta_pt_in_perp_line(start_seg.src.x, start_seg.src.y, start_seg.dst.x, start_seg.dst.y, d);
                lat_px = ret[0];
                lat_py = ret[1];

                if(this.segments.length == 2){
                    temp = new Map();
                    temp.set('x', start_seg.dst.x - lat_px);
                    temp.set('y', start_seg.dst.y - lat_py);
                    points.push(temp);
                }
                temp = new Map();
                temp.set('x', start_seg.src.x - lat_px + long_px);
                temp.set('y', start_seg.src.y - lat_py + long_py);
                points.push(temp);
            }

        }
        temp = new Map();
        temp.set('x', points[0].get('x'));
        temp.set('y', points[0].get('y'));
        points.push(temp);

        for(let point of points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }

        return points;
    }

    _iroad_points(){
        let points = [];
        let marker = true;
        let road = this.object.road;
        let segments = this.segments;
        let start = this.object.pos;
        let end = this.object.exit;
        let first = this.segments[0];
        let last = this.segments[this.segments.length-1];
        let inner = this.object.lane;
        let outer = this.object.lane + 1;
        let sx = null;
        let sy = null;
        let dx = null;
        let dy = null;

        for(let segment of road.segments.segments){
            if(segment == last){
                break;
            }
            if(segment ==first){
                marker = false;
            }
            if(marker){
                start -= segment.get_length();
            }
            end -= segment.get_length();
        }
        let dist = (road.width / 2.0) - (inner * road.get_lane_width());

        if(first == road.segments.segments[0]){
            let key_iter = road.in_matrix.keys();
            let keys = [];
            for(let ctr=0; ctr<road.in_matrix.size; ctr++){
                keys.push(key_iter.next().value);
            }

            let ret = this.trans_node(road.src_road.segments.segments[road.src_road.segments.segments.length-1],
                (keys[keys.length-1]+keys[0])/2.0, road.src_road.width, road.src_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];

            sx = first.src.x + px;
            sy = first.src.y + py;
        }
        else{
            sx = first.src.x;
            sy = first.src.y;
        }
        let ret = delta_pt_in_line(sx, sy, first.dst.x, first.dst.y, start);
        let long_sx = ret[0];
        let long_sy = ret[1];

        ret = delta_pt_in_perp_line(sx, sy, first.dst.x, first.dst.y, dist);
        let lat_sx = ret[0];
        let lat_sy = ret[1];

        if(last == road.segments.segments[road.segments.segments.length-1]){
            let val_iter = road.out_matrix.values();
            let values = [];
            for(let ctr=0; ctr<road.out_matrix.size; ctr++){
                values.push(val_iter.next().value);
            }

            ret = this.trans_node(road.dst_road.segments.segments[road.dst_road.segments.segments.length-1],
                (values[values.length-1]+values[0])/2.0, road.dst_road.width, road.dst_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];
            dx = last.dst.x + px;
            dy = last.dst.y + py;
        }
        else{
            dx = last.dst.x;
            dy = last.dst.y;
        }
        ret = delta_pt_in_line(last.src.x, last.src.y, dx, dy, end);
        let long_dx = ret[0];
        let long_dy = ret[1];

        ret = delta_pt_in_perp_line(last.src.x, last.src.y, dx, dy, dist);
        let lat_dx = ret[0];
        let lat_dy = ret[1];

        let temp = null;
        for(let segment of segments){
            if(segment == first){
                temp = new Map();
                temp.set('x', sx + long_sx - lat_sx);
                temp.set('y', sy + long_sy - lat_sy);
                points.push(temp);
                if(segments.length == 2){
                    temp = new Map();
                    temp.set('x', segment.dst.x - lat_sx);
                    temp.set('y', segment.dst.y - lat_sy);
                    points.push(temp);
                }
            }
            if(segment != first && segment != last){
                ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
                    (road.width / 2.0) - (inner * road.get_lane_width()));
                let tx = ret[0];
                let ty = ret[1];

                temp = new Map();
                temp.set('x', segment.src.x - tx);
                temp.set('y', segment.src.y - ty);
                points.push(temp);

                temp = new Map();
                temp.set('x', segment.dst.x - tx);
                temp.set('y', segment.dst.y - ty);
                points.push(temp);
            }
            if(segment == last){
                temp = new Map();
                temp.set('x', segment.src.x + long_dx - lat_dx);
                temp.set('y', segment.src.y + long_dy - lat_dy);
                points.push(temp);
            }
        }

        dist = (road.width / 2.0) - (outer * road.get_lane_width());
        ret = delta_pt_in_perp_line(first.src.x, first.src.y, first.dst.x, first.dst.y, dist);
        lat_sx = ret[0];
        lat_sy = ret[1];
        ret = delta_pt_in_perp_line(last.src.x, last.src.y, last.dst.x, last.dst.y, dist);
        lat_dx = ret[0];
        lat_dy = ret[1];

        let reversed = [];
        for(let _seg of this.segments){
            reversed.unshift(_seg);
        }

        for(let segment of reversed){
            if(segment == last){
                temp = new Map();
                temp.set('x', segment.src.x + long_dx - lat_dx);
                temp.set('y', segment.src.y + long_dy - lat_dy);
                points.push(temp);
            }
            if(segment != first && segment != last){
                ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
                    (road.width / 2.0) - (outer * road.get_lane_width()));
                let tx = ret[0];
                let ty = ret[1];

                temp = new Map();
                temp.set('x', segment.dst.x - tx);
                temp.set('y', segment.dst.y - ty);
                points.push(temp);

                temp = new Map();
                temp.set('x', segment.src.x - tx);
                temp.set('y', segment.src.y - ty);
                points.push(temp);
            }
            if(segment == first){
                if(segments.length == 2){
                    temp = new Map();
                    temp.set('x', segment.dst.x - lat_sx);
                    temp.set('y', segment.dst.y - lat_sy);
                    points.push(temp);
                }
                temp = new Map();
                temp.set('x', sx + long_sx - lat_sx);
                temp.set('y', sy + long_sy - lat_sy);
                points.push(temp);
            }
        }
        temp = new Map();
        temp.set('x', points[0].get('x'));
        temp.set('y', points[0].get('y'));
        points.push(temp);

        for(let point of points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }
        return points;
    }

    trans_node(segment, lane, width, lane_width){
        return delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
            lane * lane_width + (lane_width - width)/2.0);

    }

    destroy(){
        if(this.item){
            this.gc.delete_(this.item);
        }
        this.object.disconnect_to_all(this, this.responder);
        this.object = null;
        this.item = null;
    }
}