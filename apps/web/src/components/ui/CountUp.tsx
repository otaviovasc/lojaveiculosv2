import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = (num: number) => {
    const str = num.toString();

    if (str.includes(".")) {
      const decimals = str.split(".")[1];

      if (decimals && parseInt(decimals, 10) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };

      let formattedNumber = Intl.NumberFormat("en-US", options).format(latest);

      if (separator === ".") {
        formattedNumber = formattedNumber
          .replace(/,/g, "__COMMA__")
          .replace(/\./g, ",")
          .replace(/__COMMA__/g, ".");
      } else if (separator) {
        formattedNumber = formattedNumber.replace(/,/g, separator);
      }

      return formattedNumber;
    },
    [maxDecimals, separator],
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === "down" ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (!isInView || !startWhen) return;

    if (typeof onStart === "function") onStart();

    const timeoutId = setTimeout(() => {
      motionValue.set(direction === "down" ? from : to);
    }, delay * 1000);

    const durationTimeoutId = setTimeout(
      () => {
        if (typeof onEnd === "function") onEnd();
      },
      delay * 1000 + duration * 1000,
    );

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(durationTimeoutId);
    };
  }, [
    isInView,
    startWhen,
    motionValue,
    direction,
    from,
    to,
    delay,
    onStart,
    onEnd,
    duration,
  ]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}

function parseFormattedNumber(val: string | number) {
  if (val === undefined || val === null || val === "") {
    return { numericValue: 0, prefix: "", suffix: "", separator: "" };
  }
  if (typeof val === "number") {
    return { numericValue: val, prefix: "", suffix: "", separator: "" };
  }
  const str = String(val).trim();

  const firstDigitMatch = /\d/.exec(str);
  if (!firstDigitMatch) {
    return { numericValue: 0, prefix: str, suffix: "", separator: "" };
  }
  const firstDigitIndex = firstDigitMatch.index;
  const prefix = str.slice(0, firstDigitIndex);

  const lastDigitMatch = /\d(?!.*\d)/.exec(str);
  const lastDigitIndex = lastDigitMatch ? lastDigitMatch.index + 1 : str.length;
  const suffix = str.slice(lastDigitIndex);

  const numberStr = str.slice(firstDigitIndex, lastDigitIndex);

  let separator = "";
  let cleanNumberStr = numberStr;

  if (numberStr.includes(".") && numberStr.includes(",")) {
    if (numberStr.indexOf(".") < numberStr.indexOf(",")) {
      separator = ".";
      cleanNumberStr = numberStr.replace(/\./g, "").replace(/,/g, ".");
    } else {
      separator = ",";
      cleanNumberStr = numberStr.replace(/,/g, "");
    }
  } else if (numberStr.includes(",")) {
    const parts = numberStr.split(",");
    if (parts[1] && parts[1].length === 3) {
      separator = ".";
      cleanNumberStr = numberStr.replace(/,/g, "");
    } else {
      cleanNumberStr = numberStr.replace(/,/g, ".");
    }
  } else if (numberStr.includes(".")) {
    const parts = numberStr.split(".");
    if (parts[1] && parts[1].length === 3) {
      separator = ".";
      cleanNumberStr = numberStr.replace(/\./g, "");
    }
  }

  const numericValue = parseFloat(cleanNumberStr) || 0;

  return {
    numericValue,
    prefix,
    suffix,
    separator,
  };
}

export function AnimatedCounter({
  value,
  className = "",
  duration = 1.5,
}: {
  value: string | number;
  className?: string;
  duration?: number;
}) {
  const { numericValue, prefix, suffix, separator } =
    parseFormattedNumber(value);

  return (
    <span className={className}>
      {prefix}
      <CountUp
        from={0}
        to={numericValue}
        separator={separator}
        duration={duration}
      />
      {suffix}
    </span>
  );
}
