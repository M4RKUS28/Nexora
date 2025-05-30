import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Group,
  Button,
  Tabs,
  List,
  Radio,
  Alert,
  Box,
  Loader,
  Paper,
  Divider,
  Badge
} from '@mantine/core';
import { IconAlertCircle, IconBookmark, IconQuestionMark } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import { courseService } from '../api/courseService';

function ChapterView() {
  const { courseId, chapterId } = useParams(); // This should be the actual DB ID now
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        setLoading(true);
        // Using the ID from URL params
        const chapterData = await courseService.getChapter(courseId, chapterId);
        setChapter(chapterData);
        
        // Initialize quiz answers
        if (chapterData.mc_questions) {
          const initialAnswers = {};
          chapterData.mc_questions.forEach((q, index) => {
            initialAnswers[index] = '';
          });
          setQuizAnswers(initialAnswers);
        }
        
        setError(null);
      } catch (error) {
        setError('Failed to load chapter. Please try again later.');
        console.error('Error fetching chapter:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [courseId, chapterId]);

  const handleAnswerChange = (questionIndex, value) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: value,
    }));
  };

  const handleSubmitQuiz = () => {
    if (!chapter?.mc_questions) return;
    
    let correct = 0;
    chapter.mc_questions.forEach((question, index) => {
      if (quizAnswers[index] === question.correct_answer) {
        correct++;
      }
    });
    
    const scorePercentage = Math.round((correct / chapter.mc_questions.length) * 100);
    setQuizScore(scorePercentage);
    setQuizSubmitted(true);
    
    if (scorePercentage >= 70) {
      toast.success(`Great job! You scored ${scorePercentage}%`);
    } else {
      toast.info(`You scored ${scorePercentage}%. Try reviewing the content again.`);
    }
  };

  const markChapterComplete = async () => {
    try {
      setMarkingComplete(true);
      // Using the ID from URL params
      await courseService.markChapterComplete(courseId, chapterId);
      toast.success('Chapter marked as complete!');
      navigate(`/courses/${courseId}`);
    } catch (error) {
      toast.error('Failed to mark chapter as complete');
      console.error('Error marking chapter complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Loader size="lg" />
        </Box>
      )}

      {error && !loading && (
        <Alert 
          icon={<IconAlertCircle size={16} />}
          title="Error!" 
          color="red" 
          mb="lg"
        >
          {error}
        </Alert>
      )}

      {!loading && !error && chapter && (
        <>
          <Group position="apart" mb="md">
            <div>
              <Title order={1}>{chapter.caption}</Title>
              <Text color="dimmed">Estimated time: {chapter.time_minutes} minutes</Text>
            </div>
            <Button 
              color="green" 
              onClick={markChapterComplete} 
              loading={markingComplete}
              disabled={markingComplete}
            >
              Mark as Complete
            </Button>
          </Group>

          <Tabs value={activeTab} onTabChange={setActiveTab} mb="xl">
            <Tabs.List>
              <Tabs.Tab value="content" icon={<IconBookmark size={14} />}>Content</Tabs.Tab>
              <Tabs.Tab value="quiz" icon={<IconQuestionMark size={14} />}>
                Quiz ({chapter.mc_questions?.length || 0} Questions)
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="content" pt="xs">
              <Paper shadow="xs" p="md" withBorder>
                <div className="markdown-content">
                  <ReactMarkdown>{chapter.content}</ReactMarkdown>
                </div>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="quiz" pt="xs">
              <Paper shadow="xs" p="md" withBorder>
                {quizSubmitted && (
                  <Alert 
                    color={quizScore >= 70 ? "green" : "yellow"}
                    title={quizScore >= 70 ? "Great job!" : "Keep practicing!"} 
                    mb="lg"
                  >
                    <Group>
                      <Text>You scored {quizScore}% on the quiz</Text>
                      <Badge color={quizScore >= 70 ? "green" : "yellow"}>
                        {quizScore}%
                      </Badge>
                    </Group>
                  </Alert>
                )}
                
                {chapter.mc_questions?.map((question, qIndex) => (
                  <Card key={qIndex} mb="md" withBorder>
                    <Text weight={500} mb="md">{qIndex + 1}. {question.question}</Text>
                    
                    <Radio.Group
                      value={quizAnswers[qIndex]}
                      onChange={(value) => handleAnswerChange(qIndex, value)}
                      name={`question-${qIndex}`}
                      mb="md"
                      disabled={quizSubmitted}
                    >
                      <Radio value="a" label={question.answer_a} mb="xs" />
                      <Radio value="b" label={question.answer_b} mb="xs" />
                      <Radio value="c" label={question.answer_c} mb="xs" />
                      <Radio value="d" label={question.answer_d} mb="xs" />
                    </Radio.Group>
                    
                    {quizSubmitted && (
                      <Alert 
                        color={quizAnswers[qIndex] === question.correct_answer ? "green" : "red"}
                        title={quizAnswers[qIndex] === question.correct_answer ? "Correct" : "Incorrect"}
                      >
                        <Text mb="xs">
                          {quizAnswers[qIndex] !== question.correct_answer && (
                            <>The correct answer is: <strong>
                              {question[`answer_${question.correct_answer}`]}
                            </strong></>
                          )}
                        </Text>
                        <Text>Explanation: {question.explanation}</Text>
                      </Alert>
                    )}
                  </Card>
                ))}
                
                {!quizSubmitted && (
                  <Button 
                    onClick={handleSubmitQuiz}
                    fullWidth 
                    mt="md"
                    disabled={
                      !chapter.mc_questions || 
                      Object.values(quizAnswers).some(a => a === '')
                    }
                  >
                    Submit Quiz
                  </Button>
                )}
              </Paper>
            </Tabs.Panel>
          </Tabs>

          <Group position="apart">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              Back to Course
            </Button>
            {chapter.is_completed && (
              <Badge color="green" size="lg">Completed</Badge>
            )}
          </Group>
        </>
      )}
    </Container>
  );
}


export default ChapterView;