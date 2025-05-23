import * as React from 'react';
import classNames from 'classnames';
import { PickerPanel as RCPickerPanel } from 'rc-picker';
import type { GenerateConfig } from 'rc-picker/lib/generate';
import type { CellRenderInfo } from 'rc-picker/lib/interface';
import type {
  PickerPanelBaseProps as RCPickerPanelBaseProps,
  PickerPanelDateProps as RCPickerPanelDateProps,
  PickerPanelTimeProps as RCPickerPanelTimeProps,
} from 'rc-picker/lib/PickerPanel';
import useMergedState from 'rc-util/lib/hooks/useMergedState';

import { devUseWarning } from '../_util/warning';
import { ConfigContext } from '../config-provider';
import { useLocale } from '../locale';
import CalendarHeader from './Header';
import enUS from './locale/en_US';
import useStyle from './style';

type InjectDefaultProps<Props> = Omit<
  Props,
  'locale' | 'generateConfig' | 'prevIcon' | 'nextIcon' | 'superPrevIcon' | 'superNextIcon'
> & {
  locale?: typeof enUS;
  size?: 'large' | 'default' | 'small';
};

// Picker Props
export type PickerPanelBaseProps<DateType> = InjectDefaultProps<RCPickerPanelBaseProps<DateType>>;
export type PickerPanelDateProps<DateType> = InjectDefaultProps<RCPickerPanelDateProps<DateType>>;
export type PickerPanelTimeProps<DateType> = InjectDefaultProps<RCPickerPanelTimeProps<DateType>>;

export type PickerProps<DateType> =
  | PickerPanelBaseProps<DateType>
  | PickerPanelDateProps<DateType>
  | PickerPanelTimeProps<DateType>;

export type CalendarMode = 'year' | 'month';
export type HeaderRender<DateType> = (config: {
  value: DateType;
  type: CalendarMode;
  onChange: (date: DateType) => void;
  onTypeChange: (type: CalendarMode) => void;
}) => React.ReactNode;

export interface SelectInfo {
  source: 'year' | 'month' | 'date' | 'customize';
}

export interface CalendarProps<DateType> {
  prefixCls?: string;
  className?: string;
  rootClassName?: string;
  style?: React.CSSProperties;
  locale?: typeof enUS;
  validRange?: [DateType, DateType];
  disabledDate?: (date: DateType) => boolean;
  /** @deprecated Please use fullCellRender instead. */
  dateFullCellRender?: (date: DateType) => React.ReactNode;
  /** @deprecated Please use cellRender instead. */
  dateCellRender?: (date: DateType) => React.ReactNode;
  /** @deprecated Please use fullCellRender instead. */
  monthFullCellRender?: (date: DateType) => React.ReactNode;
  /** @deprecated Please use cellRender instead. */
  monthCellRender?: (date: DateType) => React.ReactNode;
  cellRender?: (date: DateType, info: CellRenderInfo<DateType>) => React.ReactNode;
  fullCellRender?: (date: DateType, info: CellRenderInfo<DateType>) => React.ReactNode;
  headerRender?: HeaderRender<DateType>;
  value?: DateType;
  defaultValue?: DateType;
  mode?: CalendarMode;
  fullscreen?: boolean;
  showWeek?: boolean;
  onChange?: (date: DateType) => void;
  onPanelChange?: (date: DateType, mode: CalendarMode) => void;
  onSelect?: (date: DateType, selectInfo: SelectInfo) => void;
}

function generateCalendar<DateType>(generateConfig: GenerateConfig<DateType>) {
  function isSameYear(date1: DateType, date2: DateType) {
    return date1 && date2 && generateConfig.getYear(date1) === generateConfig.getYear(date2);
  }

  function isSameMonth(date1: DateType, date2: DateType) {
    return (
      isSameYear(date1, date2) && generateConfig.getMonth(date1) === generateConfig.getMonth(date2)
    );
  }

  function isSameDate(date1: DateType, date2: DateType) {
    return (
      isSameMonth(date1, date2) && generateConfig.getDate(date1) === generateConfig.getDate(date2)
    );
  }

  const Calendar = (props: CalendarProps<DateType>) => {
    const {
      prefixCls: customizePrefixCls,
      className,
      rootClassName,
      style,
      dateFullCellRender,
      dateCellRender,
      monthFullCellRender,
      monthCellRender,
      cellRender,
      fullCellRender,
      headerRender,
      value,
      defaultValue,
      disabledDate,
      mode,
      validRange,
      fullscreen = true,
      showWeek,
      onChange,
      onPanelChange,
      onSelect,
    } = props;
    const { getPrefixCls, direction, calendar } = React.useContext(ConfigContext);
    const prefixCls = getPrefixCls('picker', customizePrefixCls);
    const calendarPrefixCls = `${prefixCls}-calendar`;

    const [wrapCSSVar, hashId, cssVarCls] = useStyle(prefixCls, calendarPrefixCls);

    const today = generateConfig.getNow();

    // ====================== Warning =======================
    if (process.env.NODE_ENV !== 'production') {
      const warning = devUseWarning('Calendar');

      warning.deprecated(!dateFullCellRender, 'dateFullCellRender', 'fullCellRender');
      warning.deprecated(!dateCellRender, 'dateCellRender', 'cellRender');
      warning.deprecated(!monthFullCellRender, 'monthFullCellRender', 'fullCellRender');
      warning.deprecated(!monthCellRender, 'monthCellRender', 'cellRender');
    }

    // ====================== State =======================

    // Value
    const [mergedValue, setMergedValue] = useMergedState(() => value || generateConfig.getNow(), {
      defaultValue,
      value,
    });

    // Mode
    const [mergedMode, setMergedMode] = useMergedState('month', {
      value: mode,
    });
    const panelMode = React.useMemo<'month' | 'date'>(
      () => (mergedMode === 'year' ? 'month' : 'date'),
      [mergedMode],
    );

    // Disabled Date
    const mergedDisabledDate = React.useCallback(
      (date: DateType) => {
        const notInRange = validRange
          ? generateConfig.isAfter(validRange[0], date) ||
            generateConfig.isAfter(date, validRange[1])
          : false;
        return notInRange || !!disabledDate?.(date);
      },
      [disabledDate, validRange],
    );

    // ====================== Events ======================
    const triggerPanelChange = (date: DateType, newMode: CalendarMode) => {
      onPanelChange?.(date, newMode);
    };

    const triggerChange = (date: DateType) => {
      setMergedValue(date);

      if (!isSameDate(date, mergedValue)) {
        // Trigger when month panel switch month
        if (
          (panelMode === 'date' && !isSameMonth(date, mergedValue)) ||
          (panelMode === 'month' && !isSameYear(date, mergedValue))
        ) {
          triggerPanelChange(date, mergedMode);
        }

        onChange?.(date);
      }
    };

    const triggerModeChange = (newMode: CalendarMode) => {
      setMergedMode(newMode);
      triggerPanelChange(mergedValue, newMode);
    };

    const onInternalSelect = (date: DateType, source: SelectInfo['source']) => {
      triggerChange(date);

      onSelect?.(date, { source });
    };

    // ====================== Locale ======================
    const getDefaultLocale = () => {
      const { locale } = props;
      const result = {
        ...enUS,
        ...locale,
      };
      result.lang = {
        ...result.lang,
        ...(locale || {}).lang,
      };
      return result;
    };

    // ====================== Render ======================
    const dateRender = React.useCallback(
      (date: DateType, info: CellRenderInfo<DateType>): React.ReactNode => {
        if (fullCellRender) {
          return fullCellRender(date, info);
        }
        if (dateFullCellRender) {
          return dateFullCellRender(date);
        }

        return (
          <div
            className={classNames(`${prefixCls}-cell-inner`, `${calendarPrefixCls}-date`, {
              [`${calendarPrefixCls}-date-today`]: isSameDate(today, date),
            })}
          >
            <div className={`${calendarPrefixCls}-date-value`}>
              {String(generateConfig.getDate(date)).padStart(2, '0')}
            </div>
            <div className={`${calendarPrefixCls}-date-content`}>
              {cellRender ? cellRender(date, info) : dateCellRender && dateCellRender(date)}
            </div>
          </div>
        );
      },
      [dateFullCellRender, dateCellRender, cellRender, fullCellRender],
    );

    const monthRender = React.useCallback(
      (date: DateType, info: CellRenderInfo<DateType>): React.ReactNode => {
        if (fullCellRender) {
          return fullCellRender(date, info);
        }
        if (monthFullCellRender) {
          return monthFullCellRender(date);
        }

        const months =
          info.locale!.shortMonths || generateConfig.locale.getShortMonths!(info.locale!.locale);

        return (
          <div
            className={classNames(`${prefixCls}-cell-inner`, `${calendarPrefixCls}-date`, {
              [`${calendarPrefixCls}-date-today`]: isSameMonth(today, date),
            })}
          >
            <div className={`${calendarPrefixCls}-date-value`}>
              {months[generateConfig.getMonth(date)]}
            </div>
            <div className={`${calendarPrefixCls}-date-content`}>
              {cellRender ? cellRender(date, info) : monthCellRender && monthCellRender(date)}
            </div>
          </div>
        );
      },
      [monthFullCellRender, monthCellRender, cellRender, fullCellRender],
    );

    const [contextLocale] = useLocale('Calendar', getDefaultLocale);

    const mergedCellRender = (current: DateType, info: CellRenderInfo<DateType>) => {
      if (info.type === 'date') {
        return dateRender(current, info);
      }

      if (info.type === 'month') {
        return monthRender(current, {
          ...info,
          locale: contextLocale?.lang,
        });
      }
    };

    return wrapCSSVar(
      <div
        className={classNames(
          calendarPrefixCls,
          {
            [`${calendarPrefixCls}-full`]: fullscreen,
            [`${calendarPrefixCls}-mini`]: !fullscreen,
            [`${calendarPrefixCls}-rtl`]: direction === 'rtl',
          },
          calendar?.className,
          className,
          rootClassName,
          hashId,
          cssVarCls,
        )}
        style={{ ...calendar?.style, ...style }}
      >
        {headerRender ? (
          headerRender({
            value: mergedValue,
            type: mergedMode,
            onChange: (nextDate) => {
              onInternalSelect(nextDate, 'customize');
            },
            onTypeChange: triggerModeChange,
          })
        ) : (
          <CalendarHeader
            prefixCls={calendarPrefixCls}
            value={mergedValue}
            generateConfig={generateConfig}
            mode={mergedMode}
            fullscreen={fullscreen}
            locale={contextLocale?.lang}
            validRange={validRange}
            onChange={onInternalSelect}
            onModeChange={triggerModeChange}
          />
        )}
        <RCPickerPanel
          value={mergedValue}
          prefixCls={prefixCls}
          locale={contextLocale?.lang}
          generateConfig={generateConfig}
          cellRender={mergedCellRender}
          onSelect={(nextDate) => {
            onInternalSelect(nextDate, panelMode);
          }}
          mode={panelMode}
          picker={panelMode}
          disabledDate={mergedDisabledDate}
          hideHeader
          showWeek={showWeek}
        />
      </div>,
    );
  };

  if (process.env.NODE_ENV !== 'production') {
    Calendar.displayName = 'Calendar';
  }

  return Calendar;
}

export default generateCalendar;
