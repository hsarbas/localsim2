from math import sqrt, fabs, cos, sin
from matplotlib.path import Path
import pyexcel
import colorsys
import collections


def mps_to_kph(mps):
    return round(mps * 3.6, 2)


def kph_to_mps(kph):
    return round(kph * 0.28, 2)


def direction(value):
    if value > 0:
        return 1
    elif value < 0:
        return -1
    else:
        return 0


def distance(*dp):
    return sqrt(sum(p ** 2 for p in dp))


def point_in_polygon(px, py, x0, y0, x1, y1, x2, y2, x3, y3):
    poly = Path([[x0, y0], [x1, y1], [x2, y2], [x3, y3]])
    return poly.contains_point([px, py])


def intersect_polygon_axes(p1, p2):
    # Checks for intersecting polygons via the separating axis theorem (SAT)
    # See http://www.dyn4j.org/2010/01/sat/ for info about SAT
    # NOTE: curent implementation assumes that conflict areas are found at iroad-iroad conflicts

    v1 = list()
    prev_coord = None
    for coord in p1:
        if prev_coord:
            v1.append((prev_coord, coord))
            prev_coord = None
        else:
            prev_coord = coord

    v2 = list()
    prev_coord = None
    for coord in p2:
        if prev_coord:
            v2.append((prev_coord, coord))
            prev_coord = None
        else:
            prev_coord = coord

    axis_p1 = _generate_axis(v1)
    axis_p2 = _generate_axis(v2)

    for axis in axis_p1:
        proj_p1 = _axis_project(v1, axis)
        proj_p2 = _axis_project(v2, axis)

        if not _is_overlap(proj_p1[0], proj_p1[1], proj_p2[0], proj_p2[1]):
            return False

    for axis in axis_p2:
        proj_p1 = _axis_project(v1, axis)
        proj_p2 = _axis_project(v2, axis)

        if not _is_overlap(proj_p1[0], proj_p1[1], proj_p2[0], proj_p2[1]):
            return False

    return True


def _generate_axis(poly):
    # Generates the axis needed to test for collision
    axis = list()
    v1 = None
    v2 = None

    for vertex in poly:
        if not v2:
            v2 = poly[len(poly) - 1]
        else:
            v2 = v1
        v1 = vertex
        # (-x,y)
        norm = (-(v2[0] - v1[0]), v2[1] - v1[1])
        axis.append(norm)

    return axis


def _axis_project(poly, axis):
    # Projects a polygon to a given axis
    min_ = poly[0][0] * axis[0] + poly[0][1] * axis[1]
    max_ = min_
    for vertex in poly:
        dot = vertex[0] * axis[0] + vertex[1] * axis[1]
        if dot < min_:
            min_ = dot
        elif dot > max_:
            max_ = dot
    return [min_, max_]


def _is_overlap(a, b, c, d):
    if a <= c <= b or a <= d <= b:
        return True
    elif c <= a <= d or c <= b <= d:
        return True
    return False


def delta_pt_in_line(x0, y0, xt, yt, d):
    """
    Computes the vector distance of the point in line from the start point, d distance away.

    :param x0: x-coordinate of the start point
    :param y0: y-coordinate of the start point
    :param xt: x-coordinate of the end point
    :param yt: y-coordinate of the end point
    :param d: distance away of the point from the start point
    :return: vector distance of the point in line from the start point, d distance away.
    """

    dx = xt - x0
    dy = yt - y0

    dir_x = direction(dx)
    dir_y = direction(dy)

    m = dy/float(dx) if dir_x != 0 else 0.0
    mp = dx/float(dy) if dir_y != 0 else 0.0

    delta_x = dir_x * d / sqrt(m ** 2 + 1)
    delta_y = dir_y * d / sqrt(mp ** 2 + 1)

    return delta_x, delta_y


def delta_pt_in_perp_line(x0, y0, xt, yt, d):
    """
    Computes the vector distance of the point perpendicular to the right of the line, d distance away.

    :param x0: x-coordinate of the start point
    :param y0: y-coordinate of the start point
    :param xt: x-coordinate of the end point
    :param yt: y-coordinate of the end point
    :param d: perpendicular distance away of the point from the line
    :return: vector distance of the point perpendicular to the right of the line, d distance away.
    """

    dx = xt - x0
    dy = yt - y0

    dir_x = direction(dx)
    dir_y = direction(dy)

    m = dy/float(dx) if dir_x != 0 else 0.0
    mp = dx/float(dy) if dir_y != 0 else 0.0

    delta_x = -dir_y * d / sqrt(mp ** 2 + 1)
    delta_y = dir_x * d / sqrt(m ** 2 + 1)

    return delta_x, delta_y


def orthogonal_projection(x0, y0, xp, yp, dx, dy):
    # projects the point (xp, yp) into a line
    # such that the projected point (x, y) and (xp, yp) defines a line
    # perpendicular to another line defined by point (x0, y0) and slope dy / dx
    ma = dy/dx if dx != 0 else 0
    mb = -dx/dy if dy != 0 else 0
    if dx == 0:
        x = x0
        y = yp
    elif dy == 0:
        x = xp
        y = y0
    else:
        x = (y0 - yp + (mb * xp) - (ma * x0)) / (mb - ma)
        y = mb * (x - xp) + yp

    return x, y


def almost_equal(a, b, tol):
    return fabs(a - b) < tol


def check_int(var_):
    try:
        int(var_)
    except ValueError:
        return False

    return True


def check_float(var_):
    try:
        float(var_)
    except ValueError:
        return False

    return True


def decompose(velocity, theta):
        v_front = velocity * cos(theta)
        v_side = velocity * sin(theta)
        return v_front, v_side


def sort_data(data):
    """Sorts the data into the pages of the exported spreadsheet after a simulation."""

    sorted_data = collections.OrderedDict()
    for key in data:
        if key in ['Summary', 'Signal Cycle', 'Travel time', 'Travel speed']:
        # if key == 'Summary' or key == 'Signal Cycle' or key == 'Travel time' or key == 'Travel speed':
            timesteps = data[key]['rows'].keys()
        else:
            timesteps = sorted(data[key]['rows'].keys())
        sorted_data[key] = [data[key]['col_names']]

        for t in timesteps:
            entry = [t]
            for i in range(1, len(data[key]['col_names'])):
                try:
                    if data[key]['col_names'][i] in data[key]['rows'][t]:
                        entry.append(data[key]['rows'][t][data[key]['col_names'][i]])
                except KeyError:
                    break

            sorted_data[key].append(entry)

    keys = list(sorted_data.keys())
    if 'Travel time' in keys:
        sorted_data['Travel time (s)'] = sorted_data.pop('Travel time')
    if 'Travel speed' in keys:
        sorted_data['Travel speed (kph)'] = sorted_data.pop('Travel speed')
    if 'u' in keys:
        sorted_data['Speed'] = sorted_data.pop('u')
    if 'q' in keys:
        sorted_data['Volume'] = sorted_data.pop('q')
    if 'k' in keys:
        sorted_data['Density'] = sorted_data.pop('k')
    if 'los' in keys:
        sorted_data['Level of Service'] = sorted_data.pop('los')
    if 'CVCC' in keys:
        sorted_data['CVCC'] = sorted_data.pop('CVCC')
    if 'delay' in keys:
        sorted_data['Stoplight Delay'] = sorted_data.pop('delay')
    if 'Signal Cycle' in keys:
        sorted_data['Signal Cycle'] = sorted_data.pop('Signal Cycle')
    # if 'delay' in keys:
    #     sorted_data['Delay'] = sorted_data.pop('delay')

    return sorted_data


def export_to_xls(filename, data):
    book = pyexcel.get_book(bookdict=data)
    book.save_as(filename)


def get_inner_segments(droad, start, end):
    marker = False
    x0, y0 = start
    x1, y1 = end
    segments = list()
    segment_start = droad.get_segment(x0, y0)
    segment_end = droad.get_segment(x1, y1)
    road = droad.object

    for segment in road.segments:
        if segment == segment_start:
            marker = True
        if marker:
            segments.append(segment)
        if segment == segment_end:
            break
    if not segments:
        # Handle inverted input
        marker = False
        for segment in reversed(road.segments):
            if segment == segment_start:
                marker = True
            if marker:
                segments.insert(0, segment)
            if segment == segment_end:
                break
    return segments


def rgb_to_hls(red, green, blue):
    # Input: rgb values (0-255)
    rval = red / 255.0
    gval = green / 255.0
    bval = blue / 255.0

    hval, lval, sval = colorsys.rgb_to_hls(rval, gval, bval)

    return [round(hval * 360), round(lval * 100), round(sval * 100)]


def hls_to_rgb(hue, lum, sat):
    # Input: hue (0-360), lum (0-100), sat (0-100)
    hval = hue / 360.0
    lval = lum / 100.0
    sval = sat / 100.0

    rval, gval, bval = colorsys.hls_to_rgb(hval, lval, sval)

    return round(rval * 255), round(gval * 255), round(bval * 255)


def hex_to_rgb(value):
    value = value.lstrip('#')
    lv = len(value)
    return tuple(int(value[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))


def class_loader(class_path, delimiter='.'):
    tokens = class_path.split(delimiter)

    module = __import__(delimiter.join(tokens[:-1]), fromlist=[tokens[-1]])
    class_ = getattr(module, tokens[-1])

    return class_


def depth_first_search(scene, entry, exit_):
    visited = set()
    visited.add(entry)

    node_stack = []
    index_stack = []
    current = entry
    i = 0

    while True:

        neighbors = scene.exits(current)

        while i < len(neighbors) and neighbors[i] in visited:
            i += 1

        if i >= len(neighbors):
            visited.remove(current)
            if len(node_stack) < 1:
                break
            current = node_stack.pop()
            i = index_stack.pop()

        elif neighbors[i] == exit_:
            yield node_stack + [current, exit_]
            i += 1

        else:
            node_stack.append(current)
            index_stack.append(i+1)
            visited.add(neighbors[i])
            current = neighbors[i]
            i = 0


def average(arr):
    if len(arr) == 0:
        return 0
    else:
        return sum(arr)/float(len(arr))


def find_next_merge(route_list):
    next_merge = ""
    basis_list = route_list[0]
    for i in list(reversed(range(1, len(basis_list)))):
        in_list = True
        for routes in route_list:
            if basis_list[i] not in routes:
                in_list = False
        if in_list:
            next_merge = basis_list[i]

    assert next_merge != ""
    return next_merge


def get_total_length(next_link, next_merge, route_list, scene):
    next_routes = [route for route in route_list if route[1] == next_link]
    assert len(next_routes) > 0
    distances = []
    for route in next_routes:
        splice = route[1:route.index(next_merge) + 1]
        dist = 0
        for road in splice:
            dist = dist + scene.get_road_by_label(road).length
        distances.append(dist)
    return min(distances)
