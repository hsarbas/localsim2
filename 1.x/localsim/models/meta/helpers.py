from localsim.analysis import matrices
import csv
from ast import literal_eval


def traffic_flow_parser(filename):
    with open(filename, 'rb') as tf_file:
        csv_reader = csv.reader(tf_file, delimiter=',')
        label = ''

        roads = ['road']
        agents = []
        frequencies = []

        for col_no, row in enumerate(csv_reader):
            if col_no == 0:
                if row[0].strip() != '[tf]':
                    raise TypeError
            elif col_no == 1:
                label = row[0].strip()
            else:
                agents.append(row[0].strip())
                frequencies.append(float(row[1].strip()))

        return matrices.ObservationMatrix(label, 'agent', 'road', agents, roads, frequencies)


def route_parser(filename):
    with open(filename, 'rb') as route_file:
        csv_reader = csv.reader(route_file, delimiter=',')
        label = ''

        roads = []
        agents = []
        frequencies = []

        for col_no, row in enumerate(csv_reader):
            if col_no == 0:
                if row[0].strip() != '[route]':
                    raise TypeError
            elif col_no == 1:
                label = row[0].strip()
            elif col_no == 2:
                agents = map(str.strip, row)
            else:
                roads.append(row[0].strip())
                frequencies.extend(map(float, row[1:]))

        return matrices.ObservationMatrix(label, 'agent', 'road', agents, roads, frequencies)


def dwell_time_parser(filename):
    with open(filename, 'rb') as dt_file:
        csv_reader = csv.reader(dt_file, delimiter=':')
        label = ''

        agents = ['bus']
        intervals = []
        frequencies = []

        for col_no, row in enumerate(csv_reader):
            if col_no == 0:
                if row[0].strip() != '[dwell time]':
                    raise TypeError
            elif col_no == 1:
                label = row[0].strip()
            else:
                temp_interval = row[0].strip()
                intervals.append(literal_eval(temp_interval))
                frequencies.append(float(row[1].strip()))

        return matrices.ObservationMatrix(label, 'interval', 'agent', intervals, agents, frequencies)
