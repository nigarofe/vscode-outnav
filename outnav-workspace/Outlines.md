Software development [action:open_webpage key:O](https://example.com)
    EARS patterns definitions
        Generic
            While <optional_pre-condition>, when <trigger>, the <system_name> shall <system_response>
        Ubiquitous
            The <system_name> shall <system_response>
        State driven
            While <precondition(s)>, the <system_name> shall <system_response>
        Event driven
            When <trigger>, the <system_name> shall <system_response>
        Optional feature
            Where <feature_is_included>, the <system_name> shall <system_response>
        Unwanted behavior
            If <trigger>, the <system_name> shall <system_response>
        Complex
            While <precondition(s)>, when <trigger>, the <system_name> shall <system_response>
    vscode-outnav
        Mental models
            AI agent
                npm dependencies and initialization
                    The Extension shall be initialized using "npm install --global yo generator-code; yo code; npm install katex"
                Systems
                    Commands
                        vscode-outnav.startOutlineNavigator
                            When the command vscode-outnav.startOutlineNavigator is executed, the Extension shall parse outnav-workspace/Outlines.md to outnav-workspace/json_exports/outlines.json according to outnav-workspace/json_exports/outlines_schema.json
                            When the outnav-workspace/Outlines.md has been sucessfully parsed, the Extension shall open the webview
                        vsvode-outnav.startOutlineQuestions
                            When the command vscode-outnav.startOutlineQuestions is executed, the Extension shall 
                    Markdown parsing
                        The Extension shall parse outline content from Outlines.md using an indented-outline format where indentation is expressed as tabs or as groups of four spaces; the parser shall convert those headings into the JSON outline structure written to outlines.json following outlines_schema.json
                    General
                        The Extension shall assume that the user opened VS Code from the outnav-workspace folder
                    Webview
                        General
                            The Extension shall provide a single webview
                            When VS Code is opened, the Extension shall read the content of outnav-workspace/json_exports/outlines.json
                        Breadcrumb navigation
                            The top of the webview shall have a clickable breadcrumb navigation providing a quick way to jump to that level
                            While the the webview is in focus, the breadcrumb navigation shall cycle through each title from the current navigation level sequentially every 1.0 seconds
                            The breadcrumb navigation shall show all options for the current level in a dropdown-like control
                        Main content
                            The webview shall have a single main content area that is visually distinct from the breadcrumb navigation and shall occupy the majority of the webview space
                            When the breadcrumb selection changes, the Extension shall update the main content area within to reflect the new selection
                            The main content area shall support multiple content renderers
                            The Extension shall choose the renderer of the main content based on the selected title's annotations 
                        Title annotations 
                            Annotation format: trailing JSON object. Example:
                                Diagram {"action":"display_image","src":"images/2025-08-18.png","alt":"Diagram","width":400}
                            Web link example:
                                Open docs {"action":"open_webpage","url":"https://example.com","key":"O"}
                        Keyboard shortcuts
                            While the webview is in focus, when the 
                                `Space` key is pressed, the webview shall pause/play the title cycling
                                `Esc` key is pressed, the webview tab shall close
                                `=`/`-` keys are pressed, the title cycling frequency shall decrease/increase
                                `A`/`D` keys are pressed, the title level shall decrease/increase
                                `J`/`L` keys are pressed, the title shall change to previous/next
Learning by questions
    Show reference materials
        Mathematics
            Algebra
            Linear Algebra
            Geometry
            Differential Equation
            Calculus
        Engineering
            Fluid Mechanics
                Quantities and units
                    Reynolds number [action:open_webpage key:F](https://en.wikipedia.org/wiki/Reynolds_number)
                Types of flow [action:open_webpage key:F](https://en.wikipedia.org/wiki/Laminar_flow)
                    Turbulent
                    Laminar
                Types of Non-Newtonian Fluids
                    Shear-thickening
                    Shear-thinning
                    Thixotropic
                    Rheopectic
                    Bingham plastics
            Continuum Mechanics
                Por que o Tensor Tensão é simétrico
                Tensor Tensão vs Tensor Deformação
                Nome das variáveis e tensores mais utilizados em Mecânica dos sólidos
                Definição coeficiente de Poisson
                Ângulos diretores e cossenos diretores
                Relação entre estresse e pressão
            Classical Mechanics
                Movimento sub-amortecido
    Show questions
        Order by PMG-X desc
        Order by DSLA
        Order by question number
Matérias UFMG
    EMA091 Mecânica dos Fluidos
        Conteúdos
            Livro Introdução à Mecânica dos Fluidos (Fox)
                    Capítulos
                        1. INTRODUÇÃO
                        2. CONCEITOS FUNDAMENTAIS
                        3. ESTÁTICA DOS FLUIDOS
                        4. EQUAÇÕES BÁSICAS NA FORMA INTEGRAL PARA UM VOLUME DE CONTROLE
            Vídeos
    EMA093 Processos de Fabricação por Usinagem
    EES039 Análise Estrutural
    EMC029 Seleção de materiais
    MAT015 Equações Diferenciais A
Employment
    Professional certifications
        IELTS
        TOELF
    Internships
        Siemens
        Kot
    Public tender
        CBMMG
        PMMG
The Great Mental Models book series
    General thinking concepts
        The Map is not the Territory
        Circle of Competence
        First Principles Thinking
        Thought Experiment
        Second-Order Thinking
        Probabilistic Thinking
        Inversion
        Occam's Razor
        Hanlon's Razor
    Physics
        Relativity
        Reciprocity
        Thermodynamics
        Inertia
        Friction and viscosity
        Velocity
        Leverage
    Chemistry
        Activation energy
        Catalysts
        Alloying
    Biology
        Evolution part one: Natural selection and extinction
        Evolution part two: Adaptation rate and the Red Queen Effect
        Competition
        Ecosystem
        Niches
        Self-Preservation
        Replication
        Cooperation
    Systems
        Feedback loops
        Equilibrium
        Bottlenecks
        Scale
        Margin of safety
        Churn
        Algorithms
        Critical mass
        Emergence
        Irreducibility
        The law of diminishin returns
    Mathematics
        Compounding
        Sampling
        Randomness
        Regression to the mean
        Multiplying by zero
        Equivalence
        Surface area
        Global and local maxima
    Economics
        Scarcity
        Supply and demand
        Optimization
        Trade-offs
        Specialization
        Interdependence
        Efficiency
        Debt
        Monooly and competition
        Creative destruction
        Gresham's law
        Bubbles
    Art
        Audience
        Genre
        Contrast
        Framing
        Rhytm
        Melody
        Representation
        Plot
        Character
        Setting
        Performance
