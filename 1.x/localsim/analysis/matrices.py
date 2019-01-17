import random


def random_event_generator(distribution, limit=None):
    if not distribution:
        raise ValueError

    events = distribution.keys()
    probabilities = distribution.values()
    no_events = len(events)

    cum_sum = [sum(probabilities[:i+1]) for i in range(no_events)]
    ranges = dict()

    for i, event in enumerate(events):
        if i == 0:
            ranges[event] = (0.0, cum_sum[i])
        else:
            ranges[event] = (cum_sum[i-1], cum_sum[i])

    while True:
        rand = round(random.random(), 4)

        for key, value in ranges.items():
            lower, upper = value

            if lower <= rand < upper:
                yield key
                break

        if limit is not None:
            if limit <= 0:
                break
            else:
                limit -= 1


class ObservationMatrix(object):
    def __init__(self, label, var1_name, var2_name, var1_values, var2_values, observations=None):
        self.label = label
        self.var1_name = var1_name
        self.var2_name = var2_name

        self.var1_values = list(var1_values)
        self.var2_values = list(var2_values)

        self.no_var1 = len(self.var1_values)
        self.no_var2 = len(self.var2_values)
        self.no_params = self.no_var1 * self.no_var2

        self.obs_matrix = [[0] * self.no_var2 for _ in range(self.no_var1)]

        if observations:
            for row in range(self.no_var1):
                for col in range(self.no_var2):
                    self.obs_matrix[row][col] = observations[col + row * self.no_var2]

    def deconstruct(self):
        fullpath = self.__class__.__module__ + '.' + self.__class__.__name__
        observation = [self.obs_matrix[row][col] for row in range(self.no_var1) for col in range(self.no_var2)]
        args = [self.label, self.var1_name, self.var2_name, list(self.var1_values), list(self.var2_values), observation]
        kwargs = {}
        return [fullpath, args, kwargs]

    def set(self, var1, var2, value):
        var1_index = self.var1_values.index(var1)
        var2_index = self.var2_values.index(var2)

        self.obs_matrix[var1_index][var2_index] = value

    def get(self, var1, var2):
        var1_index = self.var1_values.index(var1)
        var2_index = self.var2_values.index(var2)

        return self.obs_matrix[var1_index][var2_index]

    def values(self, var):
        return list(self.var1_values) if var == self.var1_name else list(self.var2_values)

    def transpose(self):
        return ObservationMatrix(self.label, self.var2_name, self.var1_name, self.var2_values, self.var1_values,
                                 [row[i] for i in range(self.no_var2) for row in self.obs_matrix])

    def reduce(self, var, val):
        if var == self.var1_name:
            var1_index = self.var1_values.index(val)

            return ObservationMatrix(self.label, self.var1_name, self.var2_name, [val], self.var2_values,
                                     self.obs_matrix[var1_index])
        elif var == self.var2_name:
            return self.transpose().reduce(var, val).transpose()
        else:
            raise ValueError('unknown variable %s' % var)

    def marginalize(self, var):
        if var == self.var1_name:
            return self.transpose().marginalize(var)
        elif var == self.var2_name:
            obs_vector = [sum(row) for row in self.obs_matrix]
            return ObservationMatrix(self.label, self.var1_name, '', self.var1_values, [''], obs_vector)
        else:
            raise ValueError('unknown variable %s' % var)

    def jpd(self, places=3):
        total = float(sum(sum(row) for row in self.obs_matrix))
        return dict(
            [
                ((var1, var2) if var2 else var1, round(self.obs_matrix[i][j] / total, places))
                for j, var2 in enumerate(self.var2_values) for i, var1 in enumerate(self.var1_values)
             ])

    def upd(self, places=3):
        eq_prob = 1.0 / self.no_params
        return dict(
            [
                ((var1, var2) if var2 else var1, round(eq_prob, places))
                for j, var2 in enumerate(self.var2_values) for i, var1 in enumerate(self.var1_values)
             ])

    def __repr__(self):
        ret = ['(%s, %s) = %s' % (self.var1_name,  self.var2_name, self.label), '=' * 50]
        for i, var1 in enumerate(self.var1_values):
            for j, var2 in enumerate(self.var2_values):
                ret.append(('(%s, %s) = %d' if var2 else '%s%s = %d') % (var1, var2,  self.obs_matrix[i][j]))
        return '\n'.join(ret)

    def __iter__(self):
        return random_event_generator(self.jpd())

    @staticmethod
    def normalize(dist_list, places=3):
        total = float(sum(dist_list))
        return [round(val/total, places) for val in dist_list]
