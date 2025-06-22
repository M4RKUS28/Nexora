//ChapterView.jsx - Fixed polling logic

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Tabs,
  Alert,
  Box,
  Loader,
  Paper,
  Badge,
} from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle, IconBookmark, IconQuestionMark, IconPhoto, IconFileText } from '@tabler/icons-react';
import { MediaGallery } from '../components/media/MediaGallery';
import { FileList } from '../components/media/FileList';
import { toast } from 'react-toastify';
import { courseService } from '../api/courseService';
import ToolbarContainer from '../components/tools/ToolbarContainer';
import { useToolbar } from '../contexts/ToolbarContext';
import AiCodeWrapper from "../components/AiCodeWrapper.jsx";
import { downloadChapterContentAsPDF, prepareElementForPDF } from '../utils/pdfDownload';
import FullscreenContentWrapper from '../components/FullscreenContentWrapper';
import Quiz from './Quiz';

function ChapterView() {
  const { t } = useTranslation('chapterView');
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const { toolbarOpen, toolbarWidth } = useToolbar();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [chapter, setChapter] = useState(null);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questionsCreated, setQuestionsCreated] = useState(false); // Start as false
  const [questionCount, setQuestionCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false); // New state for blinking
  const [quizKey, setQuizKey] = useState(0); // Force Quiz component re-mount

  // Refs for cleanup
  const contentRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const blinkTimeoutRef = useRef(null);

  useEffect(() => {
    console.log("Toolbar state changed:", { open: toolbarOpen, width: toolbarWidth });
  }, [toolbarOpen, toolbarWidth]);

  // Fetch chapter data and media info
  useEffect(() => {
    const fetchChapterAndMediaInfo = async () => {
      try {
        setLoading(true);
        // Fetch chapter data and media info (including questions check)
        const [chapterData, imagesData, filesData, questionsData] = await Promise.all([
          courseService.getChapter(courseId, chapterId),
          courseService.getImages(courseId),
          courseService.getFiles(courseId),
          courseService.getChapterQuestions(courseId, chapterId),
        ]);

        setChapter(chapterData);

        // Check if chapter has questions
        if (questionsData && questionsData.length > 0) {
          setHasQuestions(true);
          setQuestionCount(questionsData.length);
          setQuestionsCreated(true); // Questions already exist
        } else {
          setHasQuestions(false);
          setQuestionCount(0);
          setQuestionsCreated(false); // No questions yet, start polling
        }

        // Set initial media state with empty URLs (will be populated in next effect)
        setImages(imagesData.map(img => ({
          ...img,
          objectUrl: null,
          loading: true,
          error: null
        })));

        setFiles(filesData.map(file => ({
          ...file,
          objectUrl: null,
          loading: true,
          error: null
        })));

        setError(null);
      } catch (error) {
        setError(t('errors.loadFailed'));
        console.error('Error fetching chapter or media info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapterAndMediaInfo();
  }, [courseId, chapterId, t]);

  // Track if this is the initial load
  const initialLoad = useRef(true);

  // Fetch actual media files
  useEffect(() => {
    if (loading) return;

    if (!initialLoad.current && images.every(img => img.objectUrl || img.error) &&
        files.every(file => file.objectUrl || file.error)) {
      return;
    }

    const fetchMedia = async () => {
      console.log('Starting media fetch...');
      try {
        setMediaLoading(true);

        // Process images
        console.log('Processing images...', images);
        const updatedImages = await Promise.all(
          images.map(async (image) => {
            if (image.objectUrl || image.error) {
              console.log(`Skipping image ${image.id} - already processed`);
              return image;
            }

            try {
              console.log(`Fetching image ${image.id}...`);
              const blob = await courseService.downloadImage(image.id);
              const objectUrl = URL.createObjectURL(blob);
              console.log(`Successfully fetched image ${image.id}`);
              return { ...image, objectUrl, loading: false, error: null };
            } catch (error) {
              console.error(`Error fetching image ${image.id}:`, error);
              return { ...image, loading: false, error: 'Failed to load image', objectUrl: null };
            }
          })
        );

        // Process files
        console.log('Processing files...', files);
        const updatedFiles = await Promise.all(
          files.map(async (file) => {
            if (file.objectUrl || file.error) {
              console.log(`Skipping file ${file.id} - already processed`);
              return file;
            }

            try {
              console.log(`Fetching file ${file.id}...`);
              const blob = await courseService.downloadFile(file.id);
              const objectUrl = URL.createObjectURL(blob);
              console.log(`Successfully fetched file ${file.id}`);
              return { ...file, objectUrl, loading: false, error: null };
            } catch (error) {
              console.error(`Error fetching file ${file.id}:`, error);
              return { ...file, loading: false, error: 'Failed to load file', objectUrl: null };
            }
          })
        );

        setImages(updatedImages);
        setFiles(updatedFiles);

      } catch (error) {
        console.error('Error in media fetch:', error);
        toast.error(t('errors.mediaLoadFailed'));
      } finally {
        setMediaLoading(false);
        initialLoad.current = false;
      }
    };

    fetchMedia();
  }, [images, files, loading, t]);

  // Polling logic for quiz questions - FIXED
  useEffect(() => {
    // Only start polling if questions haven't been created yet
    if (questionsCreated || loading) {
      return;
    }

    console.log('Starting polling for quiz questions...');
    
    const pollForQuestions = async () => {
      try {
        const questionsData = await courseService.getChapterQuestions(courseId, chapterId);
        
        if (questionsData && questionsData.length > 0) {
          console.log('Questions found! Stopping polling.');
          
          // Clear the polling interval
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Update state
          setHasQuestions(true);
          setQuestionCount(questionsData.length);
          setQuestionsCreated(true);
          toast.success(t("quizReady"))

          
          // Force Quiz component to re-mount and fetch new data
          setQuizKey(prev => prev + 1);
          
          // Start blinking animation
          setIsBlinking(true);
          
          // Stop blinking after 4 seconds
          blinkTimeoutRef.current = setTimeout(() => {
            setIsBlinking(false);
          }, 4000);
        }
      } catch (error) {
        console.error('Error polling for questions:', error);
        // Don't show error toast for polling failures, as this is expected during creation
      }
    };

    // Start polling every 500ms
    pollIntervalRef.current = setInterval(pollForQuestions, 500);

    // Cleanup function
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [courseId, chapterId, questionsCreated, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup object URLs
      images.forEach(image => {
        if (image.objectUrl) {
          URL.revokeObjectURL(image.objectUrl);
        }
      });
      files.forEach(file => {
        if (file.objectUrl) {
          URL.revokeObjectURL(file.objectUrl);
        }
      });
      
      // Cleanup intervals and timeouts
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  const handleDeleteImage = async (imageId) => {
    try {
      setDeletingItem(imageId);
      await courseService.deleteImage(imageId);

      // Find and revoke the object URL
      const imageToDelete = images.find(img => img.id === imageId);
      if (imageToDelete?.objectUrl) {
        URL.revokeObjectURL(imageToDelete.objectUrl);
      }

      // Remove from state
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success(t('imageDeleted'));
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(t('errors.deleteFailed'));
    } finally {
      setDeletingItem(null);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      setDeletingItem(fileId);
      await courseService.deleteDocument(fileId);

      // Find and revoke the object URL
      const fileToDelete = files.find(file => file.id === fileId);
      if (fileToDelete?.objectUrl) {
        URL.revokeObjectURL(fileToDelete.objectUrl);
      }

      // Remove from state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success(t('fileDeleted'));
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(t('errors.deleteFailed'));
    } finally {
      setDeletingItem(null);
    }
  };

  const markChapterComplete = async () => {
    try {
      setMarkingComplete(true);
      await courseService.markChapterComplete(courseId, chapterId);
      toast.success(t('toast.markedCompleteSuccess'));
      navigate(`/dashboard/courses/${courseId}`);
    } catch (error) {
      toast.error(t('toast.markedCompleteError'));
      console.error('Error marking chapter complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !chapter) {
      toast.error('Content not available for download');
      return;
    }

    try {
      setDownloadingPDF(true);

      const cleanup = prepareElementForPDF(contentRef.current);
      await new Promise(resolve => setTimeout(resolve, 100));
      await downloadChapterContentAsPDF(contentRef.current, chapter.caption || 'Chapter');
      cleanup();

      toast.success('Chapter content downloaded as PDF');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const sidebarWidth = isMobile
    ? (toolbarOpen ? window.innerWidth : 0)
    : (toolbarOpen ? toolbarWidth : 0);

  if (loading) {
    return (
      <Container>
        <Group position="center" mt="xl">
          <Loader size="lg" />
          <Text>{t('loading')}</Text>
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={t('errors.genericTitle')}
          color="red"
          mt="xl"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <div
      style={{
        marginRight: sidebarWidth,
        transition: 'margin-right 0.3s ease',
        minHeight: '100vh',
      }}
    >
      {/* Add CSS for blinking animation */}
      <style>
        {`
          @keyframes tabBlink {
            0%, 50% { 
              background-color: #339af0; 
              color: white;
              transform: scale(1.05);
            }
            25%, 75% { 
              background-color: #74c0fc; 
              color: white;
              transform: scale(1.02);
            }
          }
          
          .quiz-tab-blinking {
            animation: tabBlink 1s ease-in-out 4;
            border-radius: 4px;
          }
        `}
      </style>

      <Container size="xl" py="xl">
        {chapter && (
          <>
            <Group position="apart" mb="xl">
              <Box>
                <Title order={1} mb="xs">
                  {chapter.caption || 'Chapter'}
                </Title>
                <Group>
                  {chapter.estimated_minutes && (
                    <Text color="dimmed" size="sm">
                      {t('estimatedTime', { minutes: chapter.estimated_minutes })}
                    </Text>
                  )}
                  {chapter.is_completed && (
                    <Badge color="green" variant="filled">
                      {t('badge.completed')}
                    </Badge>
                  )}
                </Group>
              </Box>

              <Group spacing="sm">
                <Button
                  variant="outline"
                  color="blue"
                  leftIcon={<IconDownload size={16} />}
                  onClick={handleDownloadPDF}
                  loading={downloadingPDF}
                  disabled={downloadingPDF || activeTab !== 'content'}
                >
                  Download PDF
                </Button>
                <Button
                  color="green"
                  onClick={markChapterComplete}
                  loading={markingComplete}
                  disabled={markingComplete}
                >
                  {t('buttons.markComplete')}
                </Button>
              </Group>
            </Group>

            <Tabs value={activeTab} onTabChange={setActiveTab} mb="xl">
              <Tabs.List>
                <Tabs.Tab value="content" icon={<IconBookmark size={14} />}>{t('tabs.content')}</Tabs.Tab>
                {images.length > 0 && (
                  <Tabs.Tab value="images" icon={<IconPhoto size={14} />}>{t('tabs.images')}</Tabs.Tab>
                )}
                {files.length > 0 && (
                  <Tabs.Tab value="files" icon={<IconFileText size={14} />}>{t('tabs.files')}</Tabs.Tab>
                )}
                {hasQuestions && (
                  <Tabs.Tab 
                    value="quiz" 
                    icon={<IconQuestionMark size={14} />}
                    className={isBlinking ? 'quiz-tab-blinking' : ''}
                  >
                    {questionCount > 0 ? t('tabs.quiz', { count: questionCount }) : 'Quiz'}
                  </Tabs.Tab>
                )}
              </Tabs.List>

              <Tabs.Panel value="content" pt="xs">
                <FullscreenContentWrapper>
                  <Paper shadow="xs" p="md" withBorder ref={contentRef}>
                    <div className="markdown-content">
                      <AiCodeWrapper>{chapter.content}</AiCodeWrapper>
                    </div>
                  </Paper>
                </FullscreenContentWrapper>
              </Tabs.Panel>

              <Tabs.Panel value="images" pt="xs">
                <Paper shadow="xs" p="md" withBorder>
                  <MediaGallery
                    images={images}
                    onDelete={handleDeleteImage}
                    deletingItem={deletingItem}
                    isMobile={isMobile}
                  />
                </Paper>
              </Tabs.Panel>

              <Tabs.Panel value="files" pt="xs">
                <Paper shadow="xs" p="md" withBorder>
                  <FileList
                    files={files}
                    onDelete={handleDeleteFile}
                    deletingItem={deletingItem}
                    mediaLoading={mediaLoading}
                  />
                </Paper>
              </Tabs.Panel>

              <Tabs.Panel value="quiz" pt="xs">
                <Quiz
                  key={quizKey} // Force re-mount when questions become available
                  courseId={courseId}
                  chapterId={chapterId}
                  onQuestionCountChange={(count) => {
                    setQuestionCount(count);
                    setHasQuestions(count > 0);
                  }}
                />
              </Tabs.Panel>
            </Tabs>

            <Group position="apart" mt="md">
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/courses/${courseId}`)}
              >
                {t('buttons.backToCourse')}
              </Button>
              <Group spacing="sm">
                <Button
                  color="green"
                  onClick={markChapterComplete}
                  loading={markingComplete}
                  disabled={markingComplete || chapter?.is_completed}
                >
                  {chapter?.is_completed ? t('badge.completed') : t('buttons.markComplete')}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Container>

      <ToolbarContainer courseId={courseId} chapterId={chapterId} />
    </div>
  );
}

export default ChapterView;