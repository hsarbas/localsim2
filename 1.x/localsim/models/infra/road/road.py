import weakref
from abc import ABCMeta, abstractmethod
from math import sqrt
from localsim.utils import signal


class AbstractRoad(signal.Signal):
    __metaclass__ = ABCMeta

    events = ['destroy', 'change', 'move']

    def __init__(self, label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, *split_nodes):
        self._lane_width = 0
        self._lanes = 0
        self.width = 0
        self.label = label
        self.lanes = lanes
        self.lane_width = lane_width
        self.speed_limit = speed_limit
        self.segments = SegmentCollection(src, dst, *split_nodes)
        self._priority = priority
        self.type = type_
        self._z_axis = z_axis  # [-4, 5]

    @abstractmethod
    def deconstruct(self):
        pass

    @property
    def src(self):
        return self.segments.src

    @property
    def dst(self):
        return self.segments.dst

    @abstractmethod
    def split(self, segment, x, y):
        pass

    @abstractmethod
    def merge(self, split_node):
        pass

    # Do not delete! Needed for conflict zones
    @property
    def priority(self):
        return self._priority

    # Do not delete! Needed for conflict zones
    @priority.setter
    def priority(self, new_priority):
        if new_priority != self._priority:
            self._priority = new_priority
            self.fire('change', value='priority')

    @property
    def lanes(self):
        return self._lanes

    @lanes.setter
    def lanes(self, new_lane):
        if new_lane > 0:
            if new_lane != self._lanes:
                self._lanes = new_lane
                self.width = self._lanes * self._lane_width
                self.fire('change', value='lanes')
        else:
            raise ValueError

    @property
    def lane_width(self):
        return self._lane_width

    @lane_width.setter
    def lane_width(self, new_lane_width):
        if new_lane_width > 0:
            if new_lane_width != self._lane_width:
                self._lane_width = new_lane_width
                self.width = self._lanes * self._lane_width
                self.fire('change', value='lane_width')
        else:
            raise ValueError

    @property
    def z_axis(self):
        return self._z_axis

    @z_axis.setter
    def z_axis(self, new_z_axis):
        if new_z_axis != self._z_axis:
            self._z_axis = new_z_axis
            self.fire('change', value='z_axis')

    def __repr__(self):
        return '<%s: %s>' % (self.__class__.__name__, self.label)

    def __str__(self):
        return self.label

    def __del__(self):
        self.fire('destroy')


class UninterruptedRoad(AbstractRoad):
    def __init__(self, label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, *split_nodes):
        super(UninterruptedRoad, self).__init__(label, src, dst, lanes, lane_width,
                                                speed_limit, priority, type_, z_axis, *split_nodes)

        self.src.connect('move', self._signal_callback)
        self.dst.connect('move', self._signal_callback)

        self.length = self.segments.length
        for s_node in self.segments.get_split_nodes():
            s_node.connect('move', self._signal_callback)

    def _signal_callback(self, event, source, **kwargs):
        if event == 'move':
            self.length = self.segments.length
            self.fire('move')

    def split(self, segment, x, y):
        split_node = self.segments.split(segment, x, y)
        split_node.connect('move', self._signal_callback)
        self.length = self.segments.length
        self.fire('change', action='split')
        return split_node

    def merge(self, split_node):
        self.segments.merge(split_node)
        split_node.disconnect('move', self._signal_callback)
        self.length = self.segments.length
        self.fire('change', action='merge')

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [
            self.label, self.src, self.dst, self.lanes, self.lane_width, self.speed_limit, self.priority, self.type,
            self.z_axis
        ] + self.segments.get_split_nodes()
        kwargs = {}
        return [fullpath, args, kwargs]


class InterruptedRoad(AbstractRoad):
    def __init__(self, label, src_road, dst_road, src_list, dst_list,
                 lanes, lane_width, speed_limit, priority, type_, z_axis, *split_nodes, **extras):
        super(InterruptedRoad, self).__init__(label, src_road.dst, dst_road.src, lanes, lane_width,
                                              speed_limit, priority, type_, z_axis, *split_nodes)
        self.w_src_road = weakref.ref(src_road)
        self.w_dst_road = weakref.ref(dst_road)

        self.src_road.connect('move', self._signal_callback)
        self.dst_road.connect('move', self._signal_callback)
        self.src_road.connect('change', self._signal_callback)
        self.dst_road.connect('change', self._signal_callback)
        self.src_road.connect('destroy', self._signal_callback)
        self.dst_road.connect('destroy', self._signal_callback)

        self.length = self.segments.length
        for s_node in self.segments.get_split_nodes():
            s_node.connect('move', self._signal_callback)

        src_list.sort()
        dst_list.sort()

        self.in_matrix = {k: v for k, v in zip(src_list, range(self.lanes))}
        self.out_matrix = {k: v for k, v in zip(range(self.lanes), dst_list)}

    @property
    def src_road(self):
        return self.w_src_road()

    @property
    def dst_road(self):
        return self.w_dst_road()

    def _signal_callback(self, event, source, **kwargs):
        if event == 'move':
            self.length = self.segments.length
            self.fire('move')
        elif event == 'destroy':
            self.fire('destroy')
        elif event == 'change' and kwargs.get('value') == 'lanes':
            if source == self.src_road:
                key_list = self.in_matrix.keys()
                for k in key_list:
                    if k not in range(self.src_road.lanes):
                        self.in_matrix.pop(k)
                while len(self.in_matrix) != len(self.out_matrix):
                    self.out_matrix.popitem()
            elif source == self.dst_road:
                key_list = self.out_matrix.keys()
                for k in key_list:
                    if self.out_matrix[k] not in range(self.dst_road.lanes):
                        self.out_matrix.pop(k)
                while len(self.out_matrix) != len(self.in_matrix):
                    self.in_matrix.popitem()
            self.fire('change')

    def split(self, segment, x, y):
        split_node = self.segments.split(segment, x, y)
        split_node.connect('move', self._signal_callback)
        self.length = self.segments.length
        self.fire('change', action='split')
        return split_node

    def merge(self, split_node):
        self.segments.merge(split_node)
        split_node.disconnect('move', self._signal_callback)
        self.length = self.segments.length
        self.fire('change', action='merge')

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [
            self.label, self.src_road, self.dst_road, self.in_matrix.keys(), self.out_matrix.values(),
            self.lanes, self.lane_width, self.speed_limit, self.priority, self.type, self.z_axis
        ] + self.segments.get_split_nodes()

        kwargs = {}
        return [fullpath, args, kwargs]

    def edit_lane_match(self, src_list, dst_list):
        src_list.sort()
        dst_list.sort()
        self.in_matrix = {k: v for k, v in zip(src_list, range(self.lanes))}
        self.out_matrix = {k: v for k, v in zip(range(self.lanes), dst_list)}
        self.fire('change')


class Segment(object):
    def __init__(self, src, dst):
        self.src = src
        self.dst = dst

        self.dx = self.dst.x - self.src.x
        self.dy = self.dst.y - self.src.y
        self.length = sqrt(self.dx ** 2 + self.dy ** 2)

        self.src.connect('move', self._signal_callback)
        self.dst.connect('move', self._signal_callback)

    def _signal_callback(self, event, source, **kwargs):
        if event == 'move':
            self.dx = self.dst.x - self.src.x
            self.dy = self.dst.y - self.src.y
            self.length = sqrt(self.dx ** 2 + self.dy ** 2)

    def split(self, x, y):
        cls = self.src.__class__

        split_node = cls(x, y, 'seg')

        return Segment(self.src, split_node), Segment(split_node, self.dst)

    def merge(self, segment):
        return Segment(self.src, segment.dst)

    def __repr__(self):
        return '<%s: %s-%s>' % (self.__class__.__name__, self.src, self.dst)


class SegmentCollection(object):
    def __init__(self, src, dst, *split_nodes):
        self.src = src
        self.dst = dst
        self.segments = [Segment(self.src, self.dst)]

        for index, split_node in enumerate(split_nodes):
            self.split(self[index], split_node.x, split_node.y)

    def __iter__(self):
        return iter(self.segments)

    def __getitem__(self, item):
        return self.segments[item]

    def get_split_nodes(self):
        return [self.segments[i].dst for i in range(len(self.segments)-1)]

    def get_split_xy(self):
        return [(self.segments[i].dst.x, self.segments[i].dst.y) for i in range(len(self.segments)-1)]

    def split(self, segment, x, y):
        split1, split2 = segment.split(x, y)

        index = self.segments.index(segment)

        self.segments[index] = split2
        self.segments.insert(index, split1)

        return split1.dst

    def merge(self, split_node):
        success = False
        for index, segment in enumerate(self.segments):
            if segment.dst == split_node:
                split1 = segment
                split2 = self.segments[index + 1]
                split_index = index
                success = True
                break

        if not success:
            raise ReferenceError

        merged_segment = split1.merge(split2)
        self.segments[split_index] = merged_segment
        self.segments.remove(split2)

    @property
    def length(self):
        return round(sum([seg.length for seg in self.segments]), 2)

    def __len__(self):
        return len(self.segments)

    def __repr__(self):
        return '<%s: %s>' % (self.__class__.__name__, str(self.segments))
