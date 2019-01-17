from localsim.utils import signal


class ConfigObject(signal.Signal):
    PX2M_DEFAULT = .18

    events = ['change']

    def __init__(self, px2m_factor=None, desired_velocity=None, minimum_headway=None, safe_time_headway=None,
                 acceleration_threshold=None, politeness_factor=None, safe_braking_deceleration=None):
        self.dp = 2
        self._px2m_factor = round(px2m_factor, self.dp) if px2m_factor else ConfigObject.PX2M_DEFAULT

        self.desired_velocity = desired_velocity
        self.minimum_headway = minimum_headway
        self.safe_time_headway = safe_time_headway
        self.acceleration_threshold = acceleration_threshold
        self.politeness_factor = politeness_factor
        self.safe_braking_deceleration = safe_braking_deceleration

    def to_m(self, px):
        return round(px * self._px2m_factor, self.dp)

    def to_px(self, m):
        return round(int(float(m) / self._px2m_factor), 2)

    @property
    def px2m_factor(self):
        return round(self._px2m_factor, self.dp)

    @px2m_factor.setter
    def px2m_factor(self, f):
        f = round(f, self.dp)

        if int(1.0/f) < 1:
            raise Pixel2MeterRatioTooSmallError
        elif f != self._px2m_factor:
            old = self._px2m_factor
            self._px2m_factor = f
            self.fire('change', old_px2m=old)

    @property
    def m2px_factor(self):
        return round(1.0/self.px2m_factor, self.dp)

    def reset(self, value=None):
        self._px2m_factor = round(value, self.dp) if value else ConfigObject.PX2M_DEFAULT

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = []
        kwargs = dict(px2m_factor=self.px2m_factor)
        return [fullpath, args, kwargs]


class Pixel2MeterRatioTooSmallError(Exception):
    pass
