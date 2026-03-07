import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
};

function promisify<T>(
  fn: (options: any, cb: (err: string, results: T) => void) => void,
  options: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn.call(AppleHealthKit, options, (err: string, results: T) => {
      if (err) reject(new Error(err));
      else resolve(results);
    });
  });
}

function promisifyNoOptions<T>(
  fn: (cb: (err: any, results: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn.call(AppleHealthKit, (err: any, results: T) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

export async function getHealthKitSupportStatus(): Promise<{
  available: boolean;
  authStatus: unknown | null;
}> {
  const available = await promisifyNoOptions<boolean>(AppleHealthKit.isAvailable).catch(() => false);
  if (!available) {
    return {
      available: false,
      authStatus: null,
    };
  }

  const authStatus = await new Promise<unknown | null>((resolve) => {
    AppleHealthKit.getAuthStatus(permissions, (error: string, results: unknown) => {
      if (error) {
        resolve(null);
        return;
      }
      resolve(results);
    });
  });

  return {
    available: true,
    authStatus,
  };
}

export async function initHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((availabilityError: unknown, available: boolean) => {
      if (availabilityError || !available) {
        console.warn('HealthKit unavailable in this build:', availabilityError);
        resolve(false);
        return;
      }

      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.warn('HealthKit init failed:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });
}

export async function getHRV(days = 7): Promise<number | null> {
  const options = {
    startDate: new Date(Date.now() - days * 86400000).toISOString(),
    ascending: false,
    limit: 1,
  };
  try {
    const results = await promisify<HealthValue[]>(
      AppleHealthKit.getHeartRateVariabilitySamples,
      options
    );
    if (results.length > 0) {
      return Math.round(results[0].value); // HealthKit SDNN is already in ms
    }
    return null;
  } catch {
    return null;
  }
}

export async function getRestingHeartRate(days = 7): Promise<number | null> {
  const options = {
    startDate: new Date(Date.now() - days * 86400000).toISOString(),
    ascending: false,
    limit: 1,
  };
  try {
    const results = await promisify<HealthValue[]>(
      AppleHealthKit.getRestingHeartRateSamples,
      options
    );
    if (results.length > 0) {
      return Math.round(results[0].value);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSleepData(days = 7): Promise<{
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  score: number;
} | null> {
  const options = {
    startDate: new Date(Date.now() - days * 86400000).toISOString(),
    limit: 100,
  };
  try {
    const results = await promisify<any[]>(
      AppleHealthKit.getSleepSamples,
      options
    );
    if (results.length === 0) return null;

    // Get last night's sleep (most recent group)
    const lastNight = results.filter((s) => {
      const start = new Date(s.startDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0);
      return start >= yesterday;
    });

    const samples = lastNight.length > 0 ? lastNight : results.slice(0, 20);

    let deepMinutes = 0;
    let remMinutes = 0;
    let totalMinutes = 0;

    for (const s of samples) {
      const duration =
        (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
        60000;
      if (s.value === 'DEEP') deepMinutes += duration;
      else if (s.value === 'REM') remMinutes += duration;
      if (s.value !== 'INBED' && s.value !== 'AWAKE') totalMinutes += duration;
    }

    // Simple sleep score: 100 if 8h sleep with good deep/REM ratio
    const hourScore = Math.min(totalMinutes / 480, 1) * 50;
    const deepScore = Math.min(deepMinutes / 90, 1) * 25;
    const remScore = Math.min(remMinutes / 90, 1) * 25;
    const score = Math.round(hourScore + deepScore + remScore);

    return {
      totalMinutes: Math.round(totalMinutes),
      deepMinutes: Math.round(deepMinutes),
      remMinutes: Math.round(remMinutes),
      score,
    };
  } catch {
    return null;
  }
}

export async function getReadinessScore(): Promise<{
  score: number;
  hrv: number;
  restingHR: number;
  sleepScore: number;
  recoveryScore: number;
}> {
  const [hrv, restingHR, sleep] = await Promise.all([
    getHRV(),
    getRestingHeartRate(),
    getSleepData(),
  ]);

  // Compute readiness from available data, fall back to defaults
  const hrvScore = hrv ? Math.min((hrv / 80) * 100, 100) : 70;
  const hrScore = restingHR ? Math.max(100 - (restingHR - 60) * 1.5, 40) : 70;
  const sleepScoreVal = sleep?.score ?? 70;
  const recovery = Math.round((hrvScore + hrScore) / 2);

  const overall = Math.round(
    hrvScore * 0.3 + hrScore * 0.2 + sleepScoreVal * 0.3 + recovery * 0.2
  );

  return {
    score: Math.min(overall, 100),
    hrv: hrv ?? 42,
    restingHR: restingHR ?? 58,
    sleepScore: sleepScoreVal,
    recoveryScore: recovery,
  };
}
