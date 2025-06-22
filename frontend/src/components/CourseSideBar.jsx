import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { courseService } from '../api/courseService';
import { 
  Box, 
  Text, 
  UnstyledButton, 
  Group, 
  ThemeIcon, 
  useMantineTheme, 
  Collapse, 
  Loader, 
  Tooltip, 
  ActionIcon, 
  Stack, 
  Divider,
  ScrollArea
} from '@mantine/core';
import { 
  IconChevronRight, 
  IconHome2, 
  IconBook, 
  IconFileText, 
  IconPhoto, 
  IconPlayerPlay, 
  IconCheck, 
  IconX, 
  IconChevronLeft, 
  IconBrain, 
  IconListCheck, 
  IconFile, 
  IconQuestionMark,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconSchool
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const ChapterItem = ({ chapter, isCurrent, isCollapsed }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const theme = useMantineTheme();
    const { t } = useTranslation('courseSidebar');
    const [isExpanded, setIsExpanded] = useState(isCurrent);
    const [hasQuiz, setHasQuiz] = useState(false);
    const [quizLoading, setQuizLoading] = useState(true);
    const quizPollIntervalRef = useRef(null);

    useEffect(() => {
        setIsExpanded(isCurrent);
    }, [isCurrent]);

    useEffect(() => {
        const checkQuiz = async () => {
            try {
                const questions = await courseService.getChapterQuestions(courseId, chapter.id);
                if (questions && questions.length > 0) {
                    setHasQuiz(true);
                    if(quizPollIntervalRef.current) clearInterval(quizPollIntervalRef.current);
                }
            } catch (error) {
                // It's okay if this fails, means no quiz yet
            } finally {
                setQuizLoading(false);
            }
        };

        checkQuiz();

        if (!hasQuiz) {
            quizPollIntervalRef.current = setInterval(checkQuiz, 5000);
        }

        return () => {
            if (quizPollIntervalRef.current) {
                clearInterval(quizPollIntervalRef.current);
            }
        };
    }, [courseId, chapter.id, hasQuiz]);

    const handleNavigation = (tab) => {
        navigate(`/dashboard/courses/${courseId}/chapters/${chapter.id}?tab=${tab}`);
    };

    const ChapterButton = ({ icon, label, tab, disabled }) => (
        <UnstyledButton 
            disabled={disabled}
            onClick={() => handleNavigation(tab)} 
            sx={{...theme.fn.focusStyles(), width: '100%', padding: `8px ${theme.spacing.xs}px`, borderRadius: theme.radius.sm, '&:hover': { backgroundColor: theme.colors.dark[6] } }}>
            <Group>
                <ThemeIcon variant="light" size="md">{icon}</ThemeIcon>
                <Text size="sm">{label}</Text>
            </Group>
        </UnstyledButton>
    );

    return (
        <Box
            sx={{
                padding: theme.spacing.xs,
                margin: `${theme.spacing.xs}px 0`,
                border: `1px solid ${isCurrent ? theme.colors.blue[8] : 'transparent'}`,
                borderRadius: theme.radius.md,
                backgroundColor: isCurrent ? (theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]) : 'transparent',
            }}
        >
            <UnstyledButton onClick={() => setIsExpanded(!isExpanded)} sx={{ width: '100%', ...theme.fn.focusStyles(), padding: theme.spacing.xs, borderRadius: theme.radius.sm }}>
                <Group position="apart">
                    <Group>
                        {isCollapsed ? (
                            <Tooltip label={chapter.title} position="right">
                                <Text>#{chapter.chapter_number}</Text>
                            </Tooltip>
                        ) : (
                            <Text weight={500}>{chapter.chapter_number}. {chapter.title}</Text>
                        )}
                    </Group>
                    <Group>
                        {chapter.is_completed && <IconCheck size={18} color={theme.colors.green[5]} />}
                        {!isCollapsed && <IconChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />}
                    </Group>
                </Group>
            </UnstyledButton>
            {!isCollapsed && (
                <Collapse in={isExpanded}>
                    <Stack spacing={4} mt="xs" pl="lg">
                        <ChapterButton icon={<IconFileText size={16} />} label={t('content')} tab="content" />
                        {chapter.has_files && <ChapterButton icon={<IconFile size={16} />} label={t('files')} tab="files" />}
                        {quizLoading ? <Loader size="xs" /> : (hasQuiz && <ChapterButton icon={<IconQuestionMark size={16} />} label={t('quiz')} tab="quiz" />)}
                    </Stack>
                </Collapse>
            )}
        </Box>
    );
};

const CourseSideBar = () => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const { t } = useTranslation(['courseSidebar', 'app']);

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const [courseData, chaptersData] = await Promise.all([
          courseService.getCourseById(courseId),
          courseService.getCourseChapters(courseId),
        ]);
        setCourse(courseData);
        setChapters(chaptersData || []);
        setError(null);
      } catch (err) {
        setError(t('errors.loadFailed'));
        console.error('Error fetching initial course data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();

    return () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    };
  }, [courseId, t]);

  useEffect(() => {
    if (course && course.status === 'CourseStatus.CREATING') {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const [polledCourse, polledChapters] = await Promise.all([
                    courseService.getCourseById(courseId),
                    courseService.getCourseChapters(courseId)
                ]);
                setChapters(polledChapters || []);
                if (polledCourse.status !== 'CourseStatus.CREATING') {
                    setCourse(polledCourse);
                    clearInterval(pollIntervalRef.current);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000);
    } else {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    }

    return () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    };
  }, [course, courseId]);

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
        <Box sx={{ width: isCollapsed ? 80 : 280, padding: theme.spacing.md, transition: 'width 0.2s' }}>
            <Loader />
        </Box>
    );
  }

  if (error) {
    return (
        <Box sx={{ width: isCollapsed ? 80 : 280, padding: theme.spacing.md, transition: 'width 0.2s' }}>
            <Text color="red">{error}</Text>
        </Box>
    );
  }

  return (
    <Box
      sx={{
        width: isCollapsed ? 80 : 300,
        padding: theme.spacing.sm,
        borderRight: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease-in-out',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
      }}
    >
        <Group position="apart" sx={{ padding: `0 ${theme.spacing.xs}px`, marginBottom: theme.spacing.md }}>
            {!isCollapsed && (
                <Group spacing="xs" component={RouterLink} to="/dashboard" sx={{ textDecoration: 'none', color: 'inherit' }}>
                    <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}><IconBrain /></ThemeIcon>
                    <Text weight={700} size="xl">Nexora</Text>
                </Group>
            )}
            <ActionIcon onClick={() => setIsCollapsed(!isCollapsed)} size="lg">
                {isCollapsed ? <IconLayoutSidebarRightCollapse size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
            </ActionIcon>
        </Group>

        <Stack spacing="xs">
            <Tooltip label={t('home')} position="right" disabled={!isCollapsed}>
                <UnstyledButton onClick={() => handleNavigate('/dashboard')} sx={{...theme.fn.focusStyles(), borderRadius: theme.radius.sm, padding: theme.spacing.xs}}>
                    <Group>
                        <ThemeIcon color="blue" variant="light" size="lg"><IconHome2 size={20} /></ThemeIcon>
                        {!isCollapsed && <Text size="md">{t('home')}</Text>}
                    </Group>
                </UnstyledButton>
            </Tooltip>

            <Tooltip label={course?.title || ''} position="right" disabled={!isCollapsed}>
                <UnstyledButton onClick={() => handleNavigate(`/dashboard/courses/${courseId}`)} sx={{...theme.fn.focusStyles(), borderRadius: theme.radius.sm, padding: theme.spacing.xs}}>
                    <Group>
                        <ThemeIcon color="grape" variant="light" size="lg"><IconSchool size={20} /></ThemeIcon>
                        {!isCollapsed && <Text size="md" weight={600} truncate>{course?.title}</Text>}
                    </Group>
                </UnstyledButton>
            </Tooltip>
        </Stack>

        <Divider my="md" />

        <ScrollArea style={{ flex: 1 }}>
            <Stack spacing="xs">
                {chapters.map((chap, index) => (
                    <ChapterItem 
                        key={chap.id} 
                        chapter={chap} 
                        isCurrent={chap.id === chapterId} 
                    />
                ))}
                 {course?.status === 'CourseStatus.CREATING' && (
                    <Group position='center' mt='md'>
                        <Loader size='sm' />
                        {!isCollapsed && <Text size='sm' color='dimmed'>{t('creation.statusCreatingChapters')}</Text>}
                    </Group>
                )}
            </Stack>
        </ScrollArea>
    </Box>
  );
};

export default CourseSideBar;
