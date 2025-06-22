import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  Container,
  Title,
  Text,
  Card,
  Group,
  SimpleGrid,
  Progress,
  Badge,
  Button,
  ThemeIcon,
  Loader,
  Alert,
  Box,
  Paper,
  Image,
  Grid,
  Divider,
  RingProgress,
  Overlay,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconArrowRight,
  IconBrain,
  IconTrophy,
  IconArrowBack,
  IconCheck,
  IconChevronRight
} from '@tabler/icons-react';
import { courseService } from '../api/courseService';

function CourseView() {
  const { t } = useTranslation('courseView');
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]); // ADDED: Dedicated state for chapters
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [creationProgressUI, setCreationProgressUI] = useState({
    statusText: t('creation.statusInitializing'),
    percentage: 0,
    chaptersCreated: 0,
    estimatedTotal: 0,
  });

  // Initial data fetch
  useEffect(() => {
    if (!courseId) {
      setError(t('errors.invalidCourseId'));
      setLoading(false);
      return;
    }

    const fetchInitialCourseData = async () => {
      try {
        setLoading(true);
        console.log('Fetching initial course data for ID:', courseId);
        const [courseData, currentChaptersData] = await Promise.all([ // CHANGED: Renamed variable for clarity
          courseService.getCourseById(courseId),
          courseService.getCourseChapters(courseId)
        ]);
        const currentChapters = currentChaptersData || []; // Ensure chapters is an array

        setCourse(courseData);
        setChapters(currentChapters); // ADDED: Populate the new chapters state
        setError(null);

        // Initialize creationProgressUI if course is in creating state
        if (courseData.status === 'CourseStatus.CREATING') {
          const totalChapters = courseData.chapter_count || 0;
          const progressPercent = totalChapters > 0 ? Math.round((currentChapters.length / totalChapters) * 100) : 0;

          setCreationProgressUI({
            statusText: t('creation.statusCreatingChapters', {
              chaptersCreated: currentChapters.length,
              totalChapters: totalChapters || t('creation.unknownTotal')
            }),
            percentage: progressPercent,
            chaptersCreated: currentChapters.length,
            estimatedTotal: totalChapters,
          });
        }
        console.log('Initial data fetched:', courseData, 'Chapters:', currentChapters);
      } catch (err) {
        setError(t('errors.loadFailed'));
        console.error('Error fetching initial course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialCourseData();
  }, [courseId, t]);

  // Polling effect for course creation
  useEffect(() => {
    // Only poll if course exists and is in CREATING status
    if (!courseId || !course || course.status !== 'CourseStatus.CREATING') {
      return;
    }

    console.log('Starting polling for course ID:', courseId, 'current status:', course.status);
    const pollInterval = setInterval(async () => {
      try {
        const [polledData, polledChaptersData] = await Promise.all([ // CHANGED: Renamed variable
          courseService.getCourseById(courseId),
          courseService.getCourseChapters(courseId)
        ]);
        const currentChapters = polledChaptersData || [];

        console.log('Polled course data:', polledData, 'Polled chapters:', currentChapters);
        setCourse(polledData);         // Update the main course state
        setChapters(currentChapters);  // ADDED: Update the chapters state on each poll

        const totalChapters = polledData.chapter_count || 0;
        const progressPercent = totalChapters > 0 ? Math.round((currentChapters.length / totalChapters) * 100) : 0;

        if (polledData.status === 'CourseStatus.FINISHED') {
          setCreationProgressUI({
            statusText: t('creation.statusComplete'),
            percentage: 100,
            chaptersCreated: currentChapters.length,
            estimatedTotal: totalChapters,
          });
          console.log('Course creation completed. Stopping poll.');
          clearInterval(pollInterval);
        } else if (polledData.status === 'CourseStatus.CREATING') {
          setCreationProgressUI({
            statusText: t('creation.statusCreatingChapters', {
                chaptersCreated: currentChapters.length,
                totalChapters: totalChapters || t('creation.unknownTotal')
            }),
            percentage: progressPercent,
            chaptersCreated: currentChapters.length,
            estimatedTotal: totalChapters,
          });
        } else {
          console.log('Course status changed to:', polledData.status, '. Stopping poll.');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling course data:', err);
      }
    }, 2000);

    return () => {
      console.log('Cleaning up poll interval for course ID:', courseId);
      clearInterval(pollInterval);
    };
  }, [course, courseId, t]); // The 'chapters' state is not needed here as it's an outcome, not a trigger for this effect.

  // REMOVED: This useMemo is no longer needed as we have a dedicated `chapters` state
  // const chapters = useMemo(() => course?.chapters || [], [course]);

  // Learning progress calculation
  const { learningPercentage, actualCompletedLearningChapters, totalCourseChaptersForLearning } = useMemo(() => {
    // CHANGED: This logic now uses the separate `chapters` state
    if (!course || !chapters) {
      return { learningPercentage: 0, actualCompletedLearningChapters: 0, totalCourseChaptersForLearning: 0 };
    }
    const completedCount = chapters.filter(ch => ch.is_completed).length;
    // We still get the total count from the main course object, which is good practice.
    const totalCount = course.chapter_count || chapters.length || 0;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return {
      learningPercentage: percentage,
      actualCompletedLearningChapters: completedCount,
      totalCourseChaptersForLearning: totalCount
    };
  }, [course, chapters]); // CHANGED: Dependency array now includes `chapters`

  // ... THE REST OF THE JSX REMAINS EXACTLY THE SAME ...
  // No changes are needed in the return() statement because it was already
  // correctly using the `chapters` variable, which now correctly points to your state.

  if (loading && !course) {
    return (
      <Container size="lg" py="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Loader size="lg" title={t('loadingCourseDetails')} />
        </Box>
      </Container>
    );
  }

  if (error && !course) {
    return (
      <Container size="lg" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={t('errors.genericTitle')}
          color="red"
          mb="lg"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  const showNonCriticalError = error && course;

  return (
    <>
      {showNonCriticalError && (
         <Alert
         icon={<IconAlertCircle size={16} />}
         title={t('errors.genericTitle')}
         color="orange"
         mb="lg"
         withCloseButton
         onClose={() => setError(null)}
       >
         {error}
       </Alert>
      )}

      {course?.status === "CourseStatus.CREATING" && (
        <Paper
          radius="md"
          p="xl"
          withBorder
          mb="xl"
          sx={(theme) => ({
            position: 'relative',
            overflow: 'hidden', backgroundColor: theme.colorScheme === 'dark' ?
              theme.colors.dark[6] :
              theme.white,
          })}
        >
          <Box
            sx={(theme) => ({
              position: 'absolute',
              top: 0,
              right: 0,
              width: '50%',
              height: '100%',
              opacity: 0.05,
              backgroundImage: (course && course.image_url) ? `url("${course.image_url}")` : 'url("https://cdn-icons-png.flaticon.com/512/8136/8136031.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              [theme.fn.smallerThan('md')]: {
                width: '100%',
              },
            })}
          />

          <Group position="apart" mb="xl">
            <Box>
              <Badge color="blue" variant="filled" size="lg" radius="sm" mb="sm">
                <Group spacing="xs">
                  <IconBrain size={16} />
                  <span>{t('creation.aiInActionBadge')}</span>
                </Group>
              </Badge>
              <Title
                order={2}
                sx={{
                  fontWeight: 800,
                  fontSize: '1.8rem',
                }}
              >
                {t('creation.title')}
              </Title>
            </Box>

            <ThemeIcon
              size={60}
              radius="xl"
              color={creationProgressUI.percentage === 100 ? "green" : "cyan"}
              variant="light"
              sx={{ border: '4px solid #f0f0f0' }}
            >
              {creationProgressUI.percentage === 100 ?
                <IconCheck size={30} /> :
                <IconClock size={30} />
              }
            </ThemeIcon>
          </Group>

          <Box mb="xl">
            <Group position="apart" mb="xs">
              <Text size="sm" weight={600} color="dimmed">{t('creation.progressLabel')}</Text>
              <Text size="sm" weight={700}>{creationProgressUI.percentage}%</Text>
            </Group>

            <Progress
              value={creationProgressUI.percentage}
              size="lg"
              radius="xl"
              color={creationProgressUI.percentage === 100 ? 'green' : 'teal'}
              animate={creationProgressUI.percentage > 0 && creationProgressUI.percentage < 100}
              sx={{
                height: 12,
                '& .mantine-Progress-bar': creationProgressUI.percentage !== 100 ? {
                  background: 'linear-gradient(90deg, #36D1DC 0%, #5B86E5 100%)'
                } : {}
              }}
            />
          </Box>

          <Box
            py="md"
            px="lg"
            mt="md"
            sx={(theme) => ({
              backgroundColor: theme.colorScheme === 'dark' ?
                theme.colors.dark[7] :
                theme.fn.rgba(theme.colors.gray[0], 0.7),
              borderRadius: theme.radius.md,
              position: 'relative',
              zIndex: 2,
            })}
          >
            <Text align="center" size="lg" weight={600} mb="xs" color={creationProgressUI.percentage === 100 ? 'teal' : undefined}>
              {t('creation.currentStatusLabel')} {creationProgressUI.statusText}
            </Text>

            {creationProgressUI.percentage > 0 && creationProgressUI.percentage < 100 && (
              <Text color="dimmed" size="sm" align="center">
                {t('creation.description')}
              </Text>
            )}

            {creationProgressUI.percentage === 100 && (
              <Group position="center" mt="md">
                <Button
                  variant="gradient"
                  gradient={{ from: 'teal', to: 'green' }}
                  leftIcon={<IconArrowRight size={16} />}
                  onClick={() => window.location.reload()}
                >
                  {t('buttons.viewCompletedCourse')}
                </Button>
              </Group>
            )}
          </Box>

          {creationProgressUI.chaptersCreated > 0 && (
            <Group position="center" mt="md" spacing="xl">
              <Box sx={{ textAlign: 'center' }}>
                <Text size="xl" weight={700}>{creationProgressUI.chaptersCreated}</Text>
                <Text size="xs" color="dimmed">{t('creation.chaptersCreatedLabelCount', { count: creationProgressUI.chaptersCreated })}</Text>
              </Box>

              <Divider orientation="vertical" />

              <Box sx={{ textAlign: 'center' }}>
                <Text size="xl" weight={700}>{creationProgressUI.estimatedTotal || t('creation.calculating')}</Text>
                <Text size="xs" color="dimmed">{t('creation.estimatedTotalLabel')}</Text>
              </Box>

              <Divider orientation="vertical" />

              <Box sx={{ textAlign: 'center' }}>
                <Text size="xl" weight={700}>{course?.total_time_hours || t('creation.calculating')} hrs</Text>
                <Text size="xs" color="dimmed">{t('creation.learningTimeLabel')}</Text>
              </Box>
            </Group>
          )}
        </Paper>
      )}

      {course && (
        <>
          <Paper
            radius="md"
            p={0}
            withBorder
            mb="xl"
            sx={(theme) => ({
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
            })}
          >
            <Grid gutter={0}>
              <Grid.Col md={7}>
                <Box p="xl">
                  <Group position="apart">
                    <Button
                      variant="subtle"
                      leftIcon={<IconArrowBack size={16} />}
                      onClick={() => navigate('/dashboard')}
                      mb="md"
                    >
                      {t('buttons.backToDashboard')}
                    </Button>

                    {course.status === "CourseStatus.CREATING" ? (
                      <Badge size="lg" color="blue" variant="filled" px="md" py="sm">
                        <Group spacing="xs" noWrap>
                          <IconClock size={16} />
                          {t('creation.statusCreatingCourse')}
                        </Group>
                      </Badge>
                    ) : (
                      <Badge size="lg" color="teal" variant="filled" px="md" py="sm">
                        {t('progress.percentageComplete', { percentage: learningPercentage })}
                      </Badge>
                    )}
                  </Group>

                  <Title
                    order={1}
                    mb="xs"
                    sx={(theme) => ({
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      backgroundImage: theme.colorScheme === 'dark'
                        ? `linear-gradient(45deg, ${theme.colors.teal[4]}, ${theme.colors.cyan[6]})`
                        : `linear-gradient(45deg, ${theme.colors.teal[7]}, ${theme.colors.cyan[5]})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    })}
                  >
                    {course.title && course.title != 'None' ? course.title : t('courseLoadingTitle')}
                  </Title>

                  <Text size="md" mb="lg" color="dimmed" sx={{ maxWidth: '600px' }}>
                    {course.description && course.description != 'None' ? course.description : t('courseLoadingDescription')}
                  </Text>

                  <Group position="apart" mb="lg">
                    <Box>
                      <Text size="sm" weight={500} color="dimmed">{t('progress.courseProgressLabel')}</Text>
                      <Group spacing="xs" mt="xs">
                        <RingProgress
                          size={60}
                          thickness={4}
                          roundCaps
                          sections={[{ value: learningPercentage, color: 'teal' }]}
                          label={
                            <Text size="xs" align="center" weight={700}>
                              {learningPercentage}%
                            </Text>
                          }
                        />
                        <div>
                          <Text size="md" weight={700}>{actualCompletedLearningChapters} of {totalCourseChaptersForLearning}</Text>
                          <Text size="xs" color="dimmed">{t('progress.chaptersCompletedStats', { completedChapters: actualCompletedLearningChapters, totalChapters: totalCourseChaptersForLearning })}</Text>
                        </div>
                      </Group>
                    </Box>

                    <Box>
                      <Text size="sm" weight={500} color="dimmed">{t('progress.estimatedTimeLabel')}</Text>
                      <Group spacing="xs" mt="xs">
                        <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                          <IconClock size={20} />
                        </ThemeIcon>
                        <div>
                          <Text size="md" weight={700}>{course.total_time_hours || "..."} hours</Text>
                        </div>
                      </Group>
                    </Box>
                  </Group>

                  {course.status !== "CourseStatus.CREATING" && chapters.length > 0 && (
                    <Button
                      size="md"
                      variant="gradient"
                      gradient={{ from: 'teal', to: 'cyan' }}
                      rightIcon={<IconChevronRight size={16} />}
                      onClick={() => navigate(`/dashboard/courses/${courseId}/chapters/${chapters[0]?.id}`)}
                      mt="md"
                    >
                      {learningPercentage > 0 ? t('buttons.continueLearning') : t('buttons.startLearning')}
                    </Button>
                  )}
                </Box>
              </Grid.Col>

              <Grid.Col md={5} sx={{ position: 'relative' }}>
                <Image
                  src={course.image_url || "https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/placeholder-image.png"}
                  height={400}
                  sx={{
                    objectFit: 'cover',
                    height: '100%',
                  }}
                  alt={course.title || t('courseImageAlt')}
                />
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: theme.spacing.md,
                  })}
                >
                  <Group spacing="xs">
                    <ThemeIcon size={32} radius="xl" color="teal" variant="filled">
                      <IconBrain size={18} />
                    </ThemeIcon>
                    <div>
                      <Text color="white" weight={600}>{t('aiGeneratedCourseLabel')}</Text>
                      <Text color="white" opacity={0.7} size="xs">
                        {t('personalizedLearningPathLabel')}
                      </Text>
                    </div>
                  </Group>
                </Box>
              </Grid.Col>
            </Grid>
          </Paper>

          <Group position="apart" align="center" mb="xl">
            <Box>
              <Title
                order={2}
                sx={(theme) => ({
                  fontWeight: 700,
                  color: theme.colorScheme === 'dark' ? theme.white : theme.black,
                })}
              >
                {t('learningJourneyLabel')}
              </Title>
              <Text color="dimmed">
                {t('followChaptersLabel')}
              </Text>
            </Box>

            {course.status !== "CourseStatus.CREATING" && chapters.length > 0 && (
              <Group spacing="xs">
                <ThemeIcon
                  size={34}
                  radius="xl"
                  color={actualCompletedLearningChapters === totalCourseChaptersForLearning && totalCourseChaptersForLearning > 0 ? "green" : "teal"}
                  variant={actualCompletedLearningChapters === totalCourseChaptersForLearning && totalCourseChaptersForLearning > 0 ? "filled" : "light"}
                >
                  {actualCompletedLearningChapters === totalCourseChaptersForLearning && totalCourseChaptersForLearning > 0 ?
                    <IconTrophy size={18} /> :
                    <IconBrain size={18} />
                  }
                </ThemeIcon>
                <div>
                  <Text weight={600} size="sm">
                    {actualCompletedLearningChapters === totalCourseChaptersForLearning && totalCourseChaptersForLearning > 0 ?
                      t('courseMasteredLabel') :
                      `${actualCompletedLearningChapters === 0 ? t('beginLearningLabel') : t('continueLearningLabel')}`}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {actualCompletedLearningChapters === totalCourseChaptersForLearning && totalCourseChaptersForLearning > 0 ?
                      t('congratulationsLabel') :
                      t('progress.chaptersCompletedText', { completedChapters: actualCompletedLearningChapters, totalChapters: totalCourseChaptersForLearning })}
                  </Text>
                </div>
              </Group>
            )}
          </Group>

          {course.status === "CourseStatus.CREATING" && chapters.length === 0 && creationProgressUI.estimatedTotal === 0 && (
            <Paper withBorder p="xl" radius="md" mb="lg" sx={(theme) => ({
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
              textAlign: 'center',
            })}>
              <Loader size="md" mb="md" mx="auto" />
              <Title order={3} mb="sm">{t('creation.buildingCourseLabel')}</Title>
              <Text color="dimmed" size="sm" maw={400} mx="auto">
                {t('creation.creatingHighQualityContentLabel')}
              </Text>
            </Paper>
          )}

          <SimpleGrid
            cols={3}
            spacing="lg"
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'sm', cols: 1 },
            ]}
          >
            {chapters.map((chapter, index) => {
              return (
                <Card
                  key={chapter.id || index}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  sx={(theme) => ({
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: theme.shadows.md
                    }
                  })}
                >

                  <Card.Section sx={{ position: 'relative' }}>
                    <Image
                      src={chapter.image_url || "https://cdn.prod.website-files.com/62b5697fd4d1b864ed69a0ac/636b26c56d140b27f7c14c1f_Blogthumbnail%20Kursstruktur%20plain%20(1)%20(1).png"}
                      alt={chapter.caption || t('chapters.defaultCaptionText', { chapterNumber: index + 1 })}
                      height={180}
                      sx={{
                        objectFit: 'cover'
                      }}
                    />

                    {chapter.is_completed && (
                      <ThemeIcon
                        size={40}
                        radius="xl"
                        color="green"
                        variant="filled"
                        sx={(theme) => ({
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          border: `2px solid ${theme.white}`,
                        })}
                      >
                        <IconCheck size={20} />
                      </ThemeIcon>
                    )}

                    <Box
                      sx={(theme) => ({
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        padding: theme.spacing.xs,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        width: '100%',
                      })}
                    >
                      <Badge
                        color={chapter.is_completed ? "green" : "blue"}
                        variant="filled"
                      >
                        {chapter.is_completed ? t('chapters.statusCompleted') : (learningPercentage > 0 && index === actualCompletedLearningChapters ? t('chapters.statusInProgress') : t('chapters.statusNotStarted'))}
                      </Badge>

                      {chapter.mc_questions && chapter.mc_questions.length > 0 && (
                        <Badge color="yellow" variant="filled" ml={6}>
                          {t('chapters.quizCount', { count: chapter.mc_questions.length })}
                        </Badge>
                      )}
                    </Box>
                  </Card.Section>
                  <Box mt="md" mb="xs" sx={{ flex: 1 }}>
                    <Text
                      weight={700}
                      size="lg"
                      lineClamp={2}
                      sx={{ minHeight: '3.2rem' }}
                    >
                      {chapter.caption || t('chapters.defaultTitleText', { chapterNumber: index + 1 })}
                    </Text>

                    <Text
                      color="dimmed"
                      size="sm"
                      mt="xs"  // Changed from "md" to "xs" for less spacing
                      sx={{ 
                        flex: 1, 
                        height: '5.5rem',  // Fixed height instead of minHeight
                        overflow: 'auto',  // Make it scrollable
                        paddingRight: '4px',  // Small padding for scrollbar space
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#ccc',
                          borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: '#999',
                        },
                      }}
                    >
                      {chapter.summary || t('chapters.defaultSummaryText')}
                    </Text>
                  </Box>

                  <Button
                    variant={chapter.is_completed ? "light" : "filled"}
                    color={chapter.is_completed ? "green" : "teal"}
                    fullWidth
                    mt="md"
                    rightIcon={chapter.is_completed ? <IconCircleCheck size={16} /> : <IconChevronRight size={16} />}
                    onClick={() => navigate(`/dashboard/courses/${courseId}/chapters/${chapter.id}`)}
                    disabled={course.status === "CourseStatus.CREATING" && index > (chapters.length -1) }
                    sx={(theme) =>
                      chapter.is_completed
                        ? {}
                        : {
                          background: theme.colorScheme === 'dark' ?
                            `linear-gradient(45deg, ${theme.colors.teal[9]}, ${theme.colors.blue[8]})` :
                            `linear-gradient(45deg, ${theme.colors.teal[6]}, ${theme.colors.cyan[5]})`,
                        }
                    }
                  >
                    {chapter.is_completed ? t('buttons.reviewChapter') : t('buttons.startChapter')}
                  </Button>
                </Card>
              );
            })}

            {course.status === "CourseStatus.CREATING" &&
              creationProgressUI.estimatedTotal > chapters.length &&
              Array.from({ length: creationProgressUI.estimatedTotal - chapters.length }).map((_,idx) => {
                const placeholderIndex = chapters.length + idx;
                return (
                  <Card
                    key={`placeholder-${placeholderIndex}`}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    sx={(theme) => ({
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: theme.colorScheme === 'dark' ?
                        theme.fn.rgba(theme.colors.dark[6], 0.8) :
                        theme.fn.rgba(theme.white, 0.8),
                    })}
                  >
                    <Card.Section>
                      <Box sx={{ position: 'relative' }}>
                        <Image
                          src="https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/placeholder-image.png"
                          height={180}
                          alt={t('creation.upcomingChapterAlt', { chapterNumber: placeholderIndex + 1 })}
                          sx={{ filter: 'blur(3px) grayscale(50%)' }}
                        />
                        <Overlay opacity={0.6} color="#000" />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                          }}
                        >
                          <Loader color="white" size="md" mb="md" />
                          <Text align="center" color="white" weight={600}>{t('creation.creatingChapterOverlay', { chapterNumber: placeholderIndex + 1 })}</Text>
                          <Text align="center" color="white" size="xs" opacity={0.8}>{t('creation.aiCraftingOverlay')}</Text>
                        </Box>
                      </Box>
                    </Card.Section>
                    <Box mt="md" sx={{ flex: 1 }}>
                      <Text weight={500} color="dimmed">{t('creation.placeholderChapterTitle', { chapterNumber: placeholderIndex + 1 })}</Text>
                      <Box mt="sm" mb="lg">
                        <Box sx={{height: '1rem', width: '80%', backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: '4px', marginBottom: '0.5rem'}} />
                        <Box sx={{height: '1rem', width: '60%', backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: '4px', marginBottom: '0.5rem'}} />
                        <Box sx={{height: '1rem', width: '70%', backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: '4px'}} />
                      </Box>
                    </Box>
                    <Button variant="light" color="gray" fullWidth mt="md" disabled>
                      {t('creation.placeholderButtonCreating')}
                    </Button>
                  </Card>
                );
              })}
          </SimpleGrid>
        </>
      )}
    </>
  );
}

export default CourseView;