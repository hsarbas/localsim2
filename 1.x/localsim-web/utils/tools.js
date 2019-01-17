function check_float(var_){
    return !!Number(var_ + 1);
}

function check_int(var_){
    return Number.isInteger(var_);
}

function has_whitespace(str){
    return !!/\s/.test(str);

}

function kph_to_mps(kph){
    return Math.round((kph * 0.28) * 100) / 100;
}

function mps_to_kph(mps){
    return Math.round((mps * 3.6) * 100) / 100
}

function direction(value){
    if(value > 0){
        return 1;
    }
    else if(value < 0){
        return -1;
    }
    else{
        return 0;
    }
}


function delta_pt_in_line(x0, y0, xt, yt, d){
    let dx = xt - x0;
    let dy = yt - y0;

    let dir_x = direction(dx);
    let dir_y = direction(dy);

    let m = 0;
    if(dir_x != 0){
       m = dy/dx;
    }
    else{
       m = 0.0;
    }

    let mp = 0;
    if(dir_y != 0){
        mp = dx/dy
    }
    else{
        mp = 0.0;
    }

    let delta_x = dir_x * d / Math.sqrt(Math.pow(m, 2) + 1);
    let delta_y = dir_y * d / Math.sqrt(Math.pow(mp, 2) + 1);

    return [delta_x, delta_y];
}


function delta_pt_in_perp_line(x0, y0, xt, yt, d){
    let dx = xt - x0;
    let dy = yt - y0;

    let dir_x = direction(dx);
    let dir_y = direction(dy);

    let m = 0;
    if(dir_x != 0){
        m = dy/dx;
    }
    else{
        m = 0.0
    }

    let mp = 0;
    if(dir_y != 0){
        mp = dx/dy;
    }
    else{
        mp = 0.0;
    }

    let delta_x = -dir_y * d / Math.sqrt(Math.pow(mp, 2) + 1);
    let delta_y = dir_x * d / Math.sqrt(Math.pow(m, 2) + 1);

    return [delta_x, delta_y];
}


function point_in_polygon(px, py, x0, y0, x1, y1, x2, y2, x3, y3){
    let poly = [
        {x: x0, y: y0},
        {x: x1, y: y1},
        {x: x2, y: y2},
        {x: x3, y: y3}
    ];

    //let points = x0 + "," + y0 + " " + x1 + "," + y1 + " " + x2 + "," + y2 + " " + x3 + "," + y3;
    //
    //app.gc.canvas.append("polygon")
    //    .attr("points", points)
    //    .style("fill", "green")
    //    .style("stroke", "black")
    //    .style("strokeWidth", "10px");

    let pt = {x: px, y: py};

    return isPointInPoly(poly, pt);
}

function isPointInPoly(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
        && (c = !c);
    return c;
}

function distance(dp){
    let sum = 0;
    dp.forEach(function(p){
        sum += Math.pow(p, 2);
    });

    return Math.sqrt(sum);
}


function orthogonal_projection(x0, y0, xp, yp, dx, dy){
    let ma = 0;
    if(dx != 0){
        ma = dy/dx;
    }
    else{
        ma = 0;
    }

    let mb = 0;
    if(dy != 0){
        mb = -dx/dy;
    }
    else{
        mb = 0;
    }

    let x = 0;
    let y = 0;
    if(dx == 0){
        x = x0;
        y = yp;
    }
    else if(dy ==0){
        x = xp;
        y = y0;
    }
    else{
        x = (y0 - yp + (mb * xp) - (ma * x0)) / (mb - ma);
        y = mb * (x - xp) + yp;
    }

    return [x,y];
}

function almost_equal(a, b, tol){
    return Math.abs(a - b) < tol;
}

function get_inner_segments(droad, start, end){
    let marker = false;
    let x0 = start[0];
    let y0 = start[1];
    let x1 = end[0];
    let y1 = end[1];

    let segments = [];
    let segment_start = droad.get_segment(x0, y0);
    let segment_end = droad.get_segment(x1, y1);
    let road = droad.object;

    for(let segment of road.segments.segments){
        if(segment == segment_start){
            marker = true;
        }
        if(marker){
            segments.push(segment);
        }
        if(segment == segment_end){
            break;
        }
    }

    if(segments.length == 0){
        marker = false;

        let reversed = [];
        for(let _seg of road.segments.segments){
            reversed.unshift(_seg);
        }

        for(let segment of reversed){
            if(segment == segment_start){
                marker = true;
            }
            if(marker){
                segments.unshift(segment);
            }
            if(segment == segment_end){
                break;
            }
        }
    }

    return segments;
}

function class_loader(class_path, delimiter='.'){
    let tokens = class_path.split(delimiter);

    let module = null;
    let class_ = null;

    return class_;
}

function slope_of_line(src_x, src_y, dst_x, dst_y){

    if(dst_x == src_x){
        return null;
    }
    else{
        return (dst_y - src_y) / (dst_x - src_x);
    }

}

function pt_intersect(line1_src_x, line1_src_y, line1_dst_x, line1_dst_y, line2_src_x, line2_src_y,
                      line2_dst_x, line2_dst_y){

    let m1 = slope_of_line(line1_src_x, line1_src_y, line1_dst_x, line1_dst_y);
    let m2 = slope_of_line(line2_src_x, line2_src_y, line2_dst_x, line2_dst_y);

    let x = 0;
    let y = 0;

    if(m1 == null){
        x = line1_src_x;
        y = m2 * (x - line2_src_x) + line2_src_y;
    }
    else if(m2 == null){
        x = line2_src_x;
        y = m1 * (x - line1_src_x) + line1_src_y;
    }
    else{
        x = ((m1 * line1_src_x) - line1_src_y - (m2 * line2_src_x) + line2_src_y) / (m1 - m2);
        y = m1 * (x - line1_src_x) + line1_src_y;
    }

    return [x, y];
}

function dist_to_pt(src_x, src_y, dst_x, dst_y){
    return Math.sqrt(Math.pow((dst_x - src_x), 2) + Math.pow((dst_y - src_y), 2));
}

function pt_in_line(src_x, src_y, dst_x, dst_y, d){

    let m = slope_of_line(src_x, src_y, dst_x, dst_y);

    let x = 0;
    let y = 0;

    if(m == null){
        x = src_x;
        y = src_y + d;
    }
    else{
        x = dst_x  - ((d * (dst_x - src_x)) / dist_to_pt(dst_x, dst_y, src_x, src_y));
        y = m * (x - dst_x) + dst_y;
    }

    return [x, y];
}

function pt_in_perp_line(src_x, src_y, dst_x, dst_y, pt_x, pt_y){

    let m = slope_of_line(src_x, src_y, dst_x, dst_y);

    let m_inv = 0;
    let b = 0;
    let x = 0;
    let y = 0;

    if(m == null){
        x = 0;
        y = pt_y;

    }
    else{
        if(m == 0){
            x = pt_x;
            y = 0;
        }
        else{
            m_inv = -1 / m;

            b = pt_y - (m_inv * pt_x);
            x = -b / m_inv;
            y = (m_inv * x) + b;
        }
    }

    return [x, y];
}

function pt_to_vector(src_x, src_y, dst_x, dst_y){
    let x = dst_x - src_x;
    let y = dst_y - src_y;

    return [x, -y];
}

function get_central_angle(src_vector, dst_vector){
    let src_x = src_vector[0];
    let src_y = src_vector[1];
    let dst_x = dst_vector[0];
    let dst_y = dst_vector[1];

    let numerator = (src_x * dst_x) + (src_y * dst_y);
    let denominator = Math.sqrt(Math.pow(src_x, 2) + Math.pow(src_y, 2)) *
        Math.sqrt(Math.pow(dst_x, 2) + Math.pow(dst_y, 2));

    return Math.acos(numerator / denominator);
}

function get_theta_dir(src_vector, dst_vector){
    let src_x = src_vector[0];
    let src_y = src_vector[1];
    let dst_x = dst_vector[0];
    let dst_y = dst_vector[1];

    return (src_x * dst_y) - (src_y * dst_x);
}

function get_delta_theta(theta, splits){
    return theta / splits;
}

function get_theta_ref(src_vector){
    return Math.atan(src_vector[1] / src_vector[0]);
}

function get_theta_src(src_vector_x, ref_theta){
    if(src_vector_x > 0){
        return ref_theta;
    }
    else{
        return Math.PI + ref_theta;
    }
}

function pt_in_arc(h, k, r, theta_src){
    let x = h + (r * Math.cos(theta_src));
    let y = k - (r * Math.sin(theta_src));

    return [x, y];
}

function check_valid_lmf(file_input, file_path){
    let allowedExtensions = /(\.lmf)$/i;
    if(!allowedExtensions.exec(file_path)){
        file_input.value = '';
        return false;
    }
    return true;
}

function check_valid_osm(file_input, file_path){
    let allowedExtensions = /(\.jpg|\.jpeg|\.png)$/i;
    if(!allowedExtensions.exec(file_path)){
        file_input.value = '';
        return false;
    }
    return true;
}

function random_unique(){
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
}