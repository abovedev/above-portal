import { useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation } from 'react-router-dom';
import { getTourStepsForPath } from '@/lib/tourSteps';

export function useTour() {
  const { pathname } = useLocation();

  const hasTour = !!getTourStepsForPath(pathname);

  const startTour = useCallback(() => {
    const steps = getTourStepsForPath(pathname);
    if (!steps || steps.length === 0) return;

    const validSteps = steps.filter((step) => {
      if (!step.element) return true;
      return !!document.querySelector(step.element as string);
    });

    if (validSteps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: '#000',
      overlayOpacity: 0.5,
      stagePadding: 6,
      stageRadius: 8,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      steps: validSteps,
    });

    driverObj.drive();
  }, [pathname]);

  return { startTour, hasTour };
}
