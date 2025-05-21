import NetworkErrorModal from '@/components/NetworkErrorModal';
import PageTitleBar from '@/components/PageTitleBar';
import { getNetworkErrorMessage, isNetworkError } from '@/lib/networkUtils';
import { supabase } from '@/lib/supabase';
import { BarChart3, Clock, Clock3, Power, TrendingUp, Zap, ZapOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PowerOutage {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

// Time period options for analytics
type TimePeriod = 'week' | 'month' | 'year';

// Analytics summary interface
interface OutageAnalytics {
  totalOutages: number;
  totalDuration: number;
  averageDuration: number;
  longestOutage: number;
  freqByDay: { [key: string]: number };
  durationByDay: { [key: string]: number };
  recentOutages: PowerOutage[];
  workTimeImpacted: number; // Add work time lost in minutes
}

// Helper function to convert to IST
const convertToIST = (date: Date): Date => {
  // Create a new date object with the correct IST time without modifying the input
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

// Helper function to get current time in IST
const getCurrentISTTime = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

// Format date in IST for display
const formatDate = (dateString: string) => {
  try {
    // Create a Date object from the timestamp
    const date = new Date(dateString);
    
    // Format it with Indian locale and timezone
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (err) {
    console.error('Error formatting date:', err);
    return dateString; // Return original string if formatting fails
  }
};

export default function PowerOutageScreen() {
  const [outages, setOutages] = useState<PowerOutage[]>([]);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsTimePeriod, setAnalyticsTimePeriod] = useState<TimePeriod>('week');
  const [analytics, setAnalytics] = useState<OutageAnalytics | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [networkError, setNetworkError] = useState<{visible: boolean; message: string}>({
    visible: false,
    message: '',
  });
  
  // Screen width for charts
  const screenWidth = Dimensions.get('window').width - 32;
  
  useEffect(() => {
    fetchOutages();
    checkCurrentOutage();
  }, []);
  
  useEffect(() => {
    if (outages.length > 0) {
      calculateAnalytics();
    }
  }, [outages, analyticsTimePeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOutages();
    await checkCurrentOutage();
    setRefreshing(false);
  };

  const fetchOutages = async () => {
    try {
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .order('start_time', { ascending: false });
      
      if (error) {
        if (isNetworkError(error)) {
          setNetworkError({
            visible: true,
            message: getNetworkErrorMessage(error)
          });
          return;
        }
        throw error;
      }
      
      setOutages(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching outages:', err);
      if (isNetworkError(err)) {
        setNetworkError({
          visible: true,
          message: getNetworkErrorMessage(err)
        });
      } else {
        setError('Failed to load outage history');
      }
    }
  };

  const checkCurrentOutage = async () => {
    try {
      // Check for an ongoing outage (no end_time)
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .is('end_time', null)
        .limit(1);
      
      if (error) throw error;
      
      // If there's an ongoing outage, power is off
      setIsPowerOn(!(data && data.length > 0));
    } catch (err) {
      console.error('Error checking current outage:', err);
      // Don't update power status on error
    }
  };

  const togglePower = async () => {
    setIsToggling(true);
    setError(null); // Clear previous errors
    
    try {
      // Check network connectivity first
      try {
        // Simple connectivity test - try to fetch a small amount of data from Supabase
        const { count, error: connectivityError } = await supabase
          .from('power_outages')
          .select('*', { count: 'exact', head: true });
          
        if (connectivityError) {
          console.error('Connectivity test failed:', connectivityError);
          // Check if it's a network error
          if (isNetworkError(connectivityError)) {
            setNetworkError({
              visible: true,
              message: getNetworkErrorMessage(connectivityError)
            });
            setIsToggling(false);
            return; // Exit early - we'll handle retry via modal
          } else {
            throw new Error('Database error: ' + connectivityError.message);
          }
        }
      } catch (connectivityErr) {
        console.error('Network test error:', connectivityErr);
        // Check if it's a network error
        if (isNetworkError(connectivityErr)) {
          setNetworkError({
            visible: true,
            message: getNetworkErrorMessage(connectivityErr)
          });
          setIsToggling(false);
          return; // Exit early - we'll handle retry via modal
        } else {
          throw new Error('Error connecting to database: ' + (connectivityErr instanceof Error ? connectivityErr.message : 'Unknown error'));
        }
      }
      
      if (isPowerOn) {
        // Record power outage start
        console.log('Attempting to record power outage start...');
        
        // Implement retry logic for better mobile reliability
        let retryCount = 0;
        const maxRetries = 2;
        let insertSuccess = false;
        
        while (retryCount <= maxRetries && !insertSuccess) {
          try {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount}...`);
            }
            
            const { data, error } = await supabase
              .from('power_outages')
              .insert([{
                start_time: new Date().toISOString()
              }])
              .select();
            
            if (error) {
              console.error('Database error recording outage start:', error);
              if (retryCount === maxRetries) {
                throw new Error(`Failed to start outage: ${error.message}`);
              }
            } else {
              console.log('Successfully recorded power outage start');
              insertSuccess = true;
              setIsPowerOn(false);
            }
          } catch (insertErr) {
            console.error(`Attempt ${retryCount + 1} failed:`, insertErr);
            if (retryCount === maxRetries) {
              throw new Error(`Database error: ${insertErr instanceof Error ? insertErr.message : 'Unknown error'}`);
            }
          }
          
          retryCount++;
          
          // Add a small delay between retries
          if (!insertSuccess && retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        // Find the ongoing outage and update its end time
        console.log('Attempting to end ongoing power outage...');
        
        // Implement retry logic
        let retryCount = 0;
        const maxRetries = 2;
        let updateSuccess = false;
        
        while (retryCount <= maxRetries && !updateSuccess) {
          try {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount}...`);
            }
            
            const { data, error: fetchError } = await supabase
              .from('power_outages')
              .select('*')
              .is('end_time', null)
              .limit(1);
            
            if (fetchError) {
              console.error('Database error fetching ongoing outage:', fetchError);
              if (retryCount === maxRetries) {
                throw new Error(`Failed to find ongoing outage: ${fetchError.message}`);
              }
            } else if (data && data.length > 0) {
              const outage = data[0] as PowerOutage;
              console.log('Found ongoing outage with ID:', outage.id);
              
              const startTime = new Date(outage.start_time);
              // const endTime = getCurrentISTTime(); No longer needed
              
              console.log(`Updating outage ID ${outage.id} with end time`);
              
              const { error: updateError } = await supabase
                .from('power_outages')
                .update({
                  end_time: new Date().toISOString()
                })
                .eq('id', outage.id);
              
              if (updateError) {
                console.error('Database error updating outage:', updateError);
                if (retryCount === maxRetries) {
                  throw new Error(`Failed to end outage: ${updateError.message}`);
                }
              } else {
                console.log('Successfully ended power outage');
                updateSuccess = true;
                setIsPowerOn(true);
              }
            } else {
              console.warn('No ongoing outage found to end. Power is likely already on.');
              
              // Let's verify that there are no active outages before creating a retroactive one
              const isPowerActuallyOn = await checkPowerStatusFromDB();
              
              if (!isPowerActuallyOn) {
                // Create a retroactive outage since the power appears to be off
                // but we have no record of when it started
                const now = new Date();
                const endTime = now.toISOString();
                const startTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
                
                console.log('Creating retroactive outage record...');
                const { error: insertError } = await supabase
                  .from('power_outages')
                  .insert([{
                    start_time: startTime,
                    end_time: endTime
                  }]);
                  
                if (insertError) {
                  console.error('Database error creating retroactive outage:', insertError);
                  if (retryCount === maxRetries) {
                    throw new Error(`Failed to create retroactive outage: ${insertError.message}`);
                  }
                } else {
                  console.log('Successfully created retroactive outage record');
                  updateSuccess = true;
                  setIsPowerOn(true);
                }
              } else {
                console.log('Power confirmed on - no retroactive record needed');
                updateSuccess = true;
                setIsPowerOn(true);
              }
            }
          } catch (updateErr) {
            console.error(`Attempt ${retryCount + 1} failed:`, updateErr);
            if (retryCount === maxRetries) {
              throw new Error(`Database error: ${updateErr instanceof Error ? updateErr.message : 'Unknown error'}`);
            }
          }
          
          retryCount++;
          
          // Add a small delay between retries
          if (!updateSuccess && retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Refresh the outage list
      await fetchOutages();
      console.log('Power status updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error toggling power:', errorMessage);
      
      // Check if it's a network error
      if (isNetworkError(err)) {
        setNetworkError({
          visible: true,
          message: getNetworkErrorMessage(err)
        });
      } else {
        setError(`Failed to record power status change: ${errorMessage}`);
      }
      
      // Recheck the current power status to ensure UI matches the database state
      await checkCurrentOutage();
    } finally {
      setIsToggling(false);
    }
  };

  // Helper function to check power status directly from DB
  const checkPowerStatusFromDB = async (): Promise<boolean> => {
    try {
      console.log('Double-checking power status from database...');
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .is('end_time', null)
        .limit(1);
      
      if (error) {
        console.error('Error checking power status:', error);
        return true; // Assume power is on if we can't check
      }
      
      // If there's an active outage, power is off
      const powerIsOff = data && data.length > 0;
      console.log(`Power status check result: power is ${powerIsOff ? 'OFF' : 'ON'}`);
      return !powerIsOff;
    } catch (err) {
      console.error('Exception checking power status:', err);
      return true; // Assume power is on if we can't check
    }
  };

  const formatDuration = (minutes: number) => {
    // Check for invalid values first
    if (isNaN(minutes) || minutes < 0) {
      return "Less than a minute";
    }
    
    // Round to nearest minute and ensure it's at least 1 minute
    minutes = Math.max(1, Math.round(minutes));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };

  const calculateOutageDuration = (outage: PowerOutage): number => {
    try {
      // First check if we have a valid duration_minutes value
      if (outage.duration_minutes != null && !isNaN(outage.duration_minutes)) {
        return outage.duration_minutes;
      }
      
      // Calculate duration based on start/end times
      const startTime = new Date(outage.start_time).getTime();
      if (isNaN(startTime)) {
        console.error('Invalid start_time:', outage.start_time);
        return 0;
      }
      
      let endTime: number;
      if (outage.end_time) {
        endTime = new Date(outage.end_time).getTime();
        if (isNaN(endTime)) {
          console.error('Invalid end_time:', outage.end_time);
          return 0;
        }
      } else {
        // Use current IST time for ongoing outages
        endTime = getCurrentISTTime().getTime();
      }
      
      // Calculate duration in minutes, ensure it's not negative
      return Math.max(0, Math.round((endTime - startTime) / (1000 * 60)));
    } catch (err) {
      console.error('Error calculating outage duration:', err, outage);
      return 0;
    }
  };

  // Helper function to check if a given time is during working hours
  const isDuringWorkHours = (date: Date): boolean => {
    // Get hours and minutes in IST
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Working hours: 8am-6pm excluding breaks (10-11am and 2-3pm)
    // 8am = 480 minutes, 10am = 600 minutes, 11am = 660 minutes
    // 2pm = 840 minutes, 3pm = 900 minutes, 6pm = 1080 minutes
    return (
      // Morning shift: 8am-10am
      (timeInMinutes >= 480 && timeInMinutes < 600) ||
      // Mid-day shift: 11am-2pm
      (timeInMinutes >= 660 && timeInMinutes < 840) ||
      // Afternoon shift: 3pm-6pm
      (timeInMinutes >= 900 && timeInMinutes < 1080)
    );
  };

  // Calculate minutes of overlap between outage and working hours
  const calculateWorkTimeImpact = (outage: PowerOutage): number => {
    try {
      const startTime = new Date(outage.start_time);
      // For end time, use the recorded end time or current time if ongoing
      const endTime = outage.end_time 
        ? new Date(outage.end_time) 
        : getCurrentISTTime();
      
      // If outage is entirely outside working hours, return 0
      const isWeekend = [0, 6].includes(startTime.getDay()); // 0 = Sunday, 6 = Saturday
      if (isWeekend) return 0;
      
      // Walk through the outage in 15-minute increments to calculate impact
      let impactedMinutes = 0;
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        if (isDuringWorkHours(currentTime)) {
          impactedMinutes += 15;
        }
        
        // Move to next 15-minute interval
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
      
      // Adjust for the last interval which might be less than 15 minutes
      const remainingMinutes = (endTime.getTime() - currentTime.getTime() + 15*60*1000) / (60*1000);
      if (remainingMinutes > 0 && remainingMinutes <= 15 && isDuringWorkHours(new Date(currentTime.getTime() - 1))) {
        impactedMinutes += remainingMinutes;
      }
      
      return impactedMinutes;
    } catch (err) {
      console.error('Error calculating work time impact:', err);
      return 0;
    }
  };

  const calculateAnalytics = () => {
    try {
      // Define date limits based on selected time period
      const now = getCurrentISTTime();
      let startDate: Date;
      
      switch (analyticsTimePeriod) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Filter outages within the selected time period
      const filteredOutages = outages.filter(outage => {
        const outageDate = new Date(outage.start_time);
        return outageDate >= startDate;
      });
      
      if (filteredOutages.length === 0) {
        setAnalytics({
          totalOutages: 0,
          totalDuration: 0,
          averageDuration: 0,
          longestOutage: 0,
          freqByDay: {},
          durationByDay: {},
          recentOutages: [],
          workTimeImpacted: 0
        });
        return;
      }
      
      // Calculate statistics
      let totalDuration = 0;
      let longestOutage = 0;
      let workTimeImpacted = 0;
      const freqByDay: {[key: string]: number} = {};
      const durationByDay: {[key: string]: number} = {};
      
      // Setup days for the selected period
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayNames.forEach(day => {
        freqByDay[day] = 0;
        durationByDay[day] = 0;
      });
      
      filteredOutages.forEach(outage => {
        const duration = calculateOutageDuration(outage);
        totalDuration += duration;
        
        // Calculate work time lost
        workTimeImpacted += calculateWorkTimeImpact(outage);
        
        if (duration > longestOutage) {
          longestOutage = duration;
        }
        
        // Calculate day frequency
        const outageDate = new Date(outage.start_time);
        const dayName = dayNames[outageDate.getDay()];
        
        freqByDay[dayName] = (freqByDay[dayName] || 0) + 1;
        durationByDay[dayName] = (durationByDay[dayName] || 0) + duration;
      });
      
      const averageDuration = totalDuration / filteredOutages.length;
      
      setAnalytics({
        totalOutages: filteredOutages.length,
        totalDuration,
        averageDuration,
        longestOutage,
        freqByDay,
        durationByDay,
        recentOutages: filteredOutages.slice(0, 5),
        workTimeImpacted
      });
      
    } catch (err) {
      console.error('Error calculating analytics:', err);
    }
  };

  const getBarChartData = (dataType: 'frequency' | 'duration') => {
    if (!analytics) return null;
    
    // Use single character labels for minimum spacing
    const dayOrder = ['S','M','T','W','T','F','S'];
    const data = dataType === 'frequency' ? analytics.freqByDay : analytics.durationByDay;
    
    // Map original day names to single characters for display
    const dayNameMap = {
      'Sun': 0, // First S
      'Mon': 1, // M
      'Tue': 2, // T
      'Wed': 3, // W
      'Thu': 4, // Second T
      'Fri': 5, // F
      'Sat': 6  // Last S
    };
    
    // Create data array by day order
    const dataValues = [0, 0, 0, 0, 0, 0, 0]; // Initialize with zeros
    Object.entries(data).forEach(([day, value]) => {
      const index = dayNameMap[day as keyof typeof dayNameMap];
      if (index !== undefined) {
        dataValues[index] = value;
      }
    });
    
    // Make sure we have data for all days, even if zero
    const chartData = {
      labels: dayOrder,
      datasets: [
        {
          data: dataValues,
          color: (opacity = 1) => dataType === 'frequency' ? `rgba(33, 150, 243, ${opacity})` : `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 0
        }
      ]
    };
    
    return chartData;
  };

  const renderAnalyticsSection = () => {
    if (!analytics) return null;
    
    // Format current time for display
    const currentTime = getCurrentISTTime().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return (
      <View style={styles.section}>
        <View style={styles.currentTimeContainer}>
          <Clock size={18} color="#666" />
          <Text style={styles.currentTimeText}>Current Time: {currentTime}</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Power Outage Analytics</Text>
        
        <View style={styles.analyticsPeriodSelector}>
          <Pressable
            style={[styles.periodButton, analyticsTimePeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setAnalyticsTimePeriod('week')}
          >
            <Text style={[styles.periodButtonText, analyticsTimePeriod === 'week' && styles.periodButtonTextActive]}>Week</Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, analyticsTimePeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setAnalyticsTimePeriod('month')}
          >
            <Text style={[styles.periodButtonText, analyticsTimePeriod === 'month' && styles.periodButtonTextActive]}>Month</Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, analyticsTimePeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setAnalyticsTimePeriod('year')}
          >
            <Text style={[styles.periodButtonText, analyticsTimePeriod === 'year' && styles.periodButtonTextActive]}>Year</Text>
          </Pressable>
        </View>
        
        {/* Summary stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
              <BarChart3 size={20} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{analytics.totalOutages}</Text>
            <Text style={styles.statLabel}>Total Outages</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <Clock3 size={20} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{formatDuration(analytics.averageDuration)}</Text>
            <Text style={styles.statLabel}>Avg Duration</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
              <TrendingUp size={20} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>{formatDuration(analytics.totalDuration)}</Text>
            <Text style={styles.statLabel}>Total Downtime</Text>
          </View>
        </View>

        {/* Work Time Impact Section */}
        <View style={styles.workImpactContainer}>
          <Text style={styles.workImpactTitle}>
            Work Time Lost ({analyticsTimePeriod}):
          </Text>
          <Text style={styles.workImpactValue}>
            {formatDuration(analytics.workTimeImpacted)}
          </Text>
        </View>
        
        {analytics.totalOutages === 0 && (
          <View style={styles.emptyAnalytics}>
            <Text style={styles.emptyAnalyticsText}>No outages recorded in this period</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageTitleBar title="Power Outage Tracker" showBack={false} />
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Power Toggle Section */}
        <View style={[
          styles.powerSection,
          isPowerOn ? styles.powerOnSection : styles.powerOffSection
        ]}>
          <View style={styles.powerStatusContainer}>
            {isPowerOn ? (
              <Zap size={40} color="#4CAF50" />
            ) : (
              <ZapOff size={40} color="#F44336" />
            )}
            <Text style={[
              styles.powerStatusText,
              isPowerOn ? styles.powerOnText : styles.powerOffText
            ]}>
              Power is {isPowerOn ? 'ON' : 'OFF'}
            </Text>
          </View>

          <Pressable 
            style={[
              styles.powerButton,
              isPowerOn ? styles.powerOnButton : styles.powerOffButton,
              isToggling && styles.disabledButton
            ]}
            onPress={togglePower}
            disabled={isToggling}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            android_ripple={{ color: isPowerOn ? '#d32f2f' : '#1b5e20', radius: 20 }}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Power size={24} color="#fff" />
                <Text style={styles.powerButtonText}>
                  Toggle Power {isPowerOn ? 'OFF' : 'ON'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
        
        {/* Analytics Section */}
        {renderAnalyticsSection()}

        {/* Outage History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Outages</Text>
          
          {outages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No outages recorded yet</Text>
            </View>
          ) : (
            <View>
              {/* Timeline Chart */}
              <View style={styles.timelineChartContainer}>
                <Text style={styles.timelineChartTitle}>Outage Timeline</Text>
                <View style={styles.timelineContainer}>
                  {outages.slice(0, 10).map((outage, index) => {
                    const duration = calculateOutageDuration(outage);
                    const maxDuration = Math.max(...outages.slice(0, 10).map(o => calculateOutageDuration(o)));
                    const barWidth = Math.max(20, (duration / maxDuration) * 100);
                    const startDate = new Date(outage.start_time);
                    const formattedDate = `${startDate.getDate()}/${startDate.getMonth() + 1}`;
                    
                    return (
                      <View key={outage.id} style={styles.timelineItem}>
                        <View style={styles.timelineDateContainer}>
                          <Text style={styles.timelineDate}>{formattedDate}</Text>
                        </View>
                        <View style={styles.timelineConnector}>
                          <View style={styles.timelineDot} />
                          {index < outages.slice(0, 10).length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <View style={styles.timelineBarContainer}>
                            <View style={[styles.timelineBar, { width: `${barWidth}%` }]} />
                          </View>
                          <Text style={styles.timelineDuration}>{formatDuration(duration)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                
                {/* Legend */}
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={styles.legendColor} />
                    <Text style={styles.legendText}>Duration of outage</Text>
                  </View>
                </View>
              </View>
              
              {/* Detailed List (Collapsible) */}
              <Pressable 
                style={styles.detailsButton}
                onPress={() => setShowDetails(!showDetails)}
              >
                <Text style={styles.detailsButtonText}>
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Text>
              </Pressable>
              
              {showDetails && (
                <View style={styles.detailsContainer}>
                  {outages.map(outage => (
                    <View key={outage.id} style={styles.outageItem}>
                      <View style={styles.outageHeader}>
                        <Clock size={18} color="#666" />
                        <Text style={styles.outageTime}>
                          {formatDate(outage.start_time)}
                        </Text>
                      </View>
                      
                      <View style={styles.outageDetails}>
                        <Text style={styles.outageLabel}>Duration:</Text>
                        <Text style={styles.outageDuration}>
                          {formatDuration(calculateOutageDuration(outage))}
                        </Text>
                      </View>
                      
                      {outage.end_time && (
                        <View style={styles.outageDetails}>
                          <Text style={styles.outageLabel}>Ended:</Text>
                          <Text style={styles.outageTime}>
                            {formatDate(outage.end_time)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.bottomSpace} />
      </ScrollView>
      
      {/* Network Error Modal */}
      <NetworkErrorModal
        visible={networkError.visible}
        errorMessage={networkError.message}
        onRetry={() => {
          setNetworkError({visible: false, message: ''});
          togglePower(); // Retry the operation
        }}
        onClose={() => setNetworkError({visible: false, message: ''})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 80,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  bottomSpace: {
    height: 60, // Increased height for bottom navigation bar
    width: '100%',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  powerSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  powerOnSection: {
    backgroundColor: '#e8f5e9',
  },
  powerOffSection: {
    backgroundColor: '#ffebee',
  },
  powerStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  powerStatusText: {
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    marginLeft: 12,
  },
  powerOnText: {
    color: '#2E7D32',
  },
  powerOffText: {
    color: '#C62828',
  },
  powerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    minHeight: 48,
    marginTop: 6,
    marginBottom: 6,
  },
  powerOnButton: {
    backgroundColor: '#F44336',
  },
  powerOffButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.7,
  },
  powerButtonText: {
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  outageItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  outageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  outageTime: {
    color: '#333',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  outageDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  outageLabel: {
    color: '#666',
    fontSize: 14,
    width: 70,
    fontFamily: 'AsapCondensed_400Regular',
  },
  outageDuration: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  analyticsPeriodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'center',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  periodButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  periodButtonText: {
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  periodButtonTextActive: {
    color: '#2196F3',
    fontFamily: 'AsapCondensed_400Regular',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyAnalytics: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAnalyticsText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    textAlign: 'center',
  },
  currentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  currentTimeText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginLeft: 8,
    textAlign: 'center',
  },
  workImpactContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  workImpactTitle: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  workImpactValue: {
    fontSize: 24,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#f44336',
    marginVertical: 8,
  },
  workImpactNote: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  timelineChartContainer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  timelineChartTitle: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 16,
    fontWeight: '500',
  },
  timelineContainer: {
    marginVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    height: 40,
  },
  timelineDateContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    fontWeight: '500',
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginVertical: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: '#4CAF50',
    opacity: 0.5,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  timelineBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  timelineBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  timelineDuration: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    width: 80,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  detailsButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginHorizontal: 8,
  },
}); 